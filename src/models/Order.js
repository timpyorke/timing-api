const { ORDER_STATUS, DEFAULT_LOCALE, DAY_MS, DEFAULT_ANALYTICS_LOOKBACK_DAYS, TOP_ITEMS_LIMITS } = require('../utils/constants');
const { Op, fn, col, literal, where: sqWhere } = require('sequelize');
const orm = require('../orm');
const Inventory = require('./Inventory');

/**
 * @typedef {(number|string)} Decimalish
 */

/**
 * @typedef {Object} OrderItemDTO
 * @property {number} id
 * @property {number} menu_id
 * @property {string} [menu_name]
 * @property {string|null} [menu_description]
 * @property {string|null} [image_url]
 * @property {Record<string, any>} [customizations]
 * @property {number} quantity
 * @property {Decimalish} price
 */

/**
 * @typedef {Object} OrderDTO
 * @property {number} id
 * @property {string|null} [customer_id]
 * @property {Record<string, any>} customer_info
 * @property {string} status
 * @property {Decimalish} discount_amount
 * @property {Decimalish} total
 * @property {string|null} [notes]
 * @property {string|null} [attachment_url]
 * @property {string|null} [customer_locale]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {OrderItemDTO[]} [items]
 */

class Order {
  /**
   * Create a new order and return a localized plain object.
   * @param {Object} orderData
   * @param {string|null} [orderData.customer_id]
   * @param {Record<string, any>} orderData.customer_info
   * @param {Decimalish} orderData.total
   * @param {Decimalish} [orderData.discount_amount]
   * @param {string|null} [orderData.notes]
   * @param {string|null} [orderData.customer_locale]
   * @param {Array<{menu_id:number, quantity:number, price:Decimalish, customizations?:Record<string, any>}>} orderData.items
   * @returns {Promise<OrderDTO>}
   */
  static async create(orderData) {
    const { sequelize, models: { Order: OrderModel, OrderItem: OrderItemModel, Menu: MenuModel } } = orm;
    return await sequelize.transaction(async (t) => {
      // Deduct inventory for this order within the same transaction
      try {
        const itemsForStock = (orderData.items || []).map(i => ({ menu_id: i.menu_id, quantity: Number(i.quantity || 0) }));
        await Inventory.checkAndDeductStockForOrder(itemsForStock, t);
      } catch (e) {
        // Surface clear inventory errors to the caller
        throw new Error(e?.message || 'Inventory update failed');
      }

      const created = await OrderModel.create({
        customer_id: orderData.customer_id || null,
        customer_info: orderData.customer_info,
        status: ORDER_STATUS.PENDING,
        discount_amount: orderData.discount_amount || 0,
        total: orderData.total,
        attachment_url: orderData.attachment_url || null,
        notes: orderData.notes || null,
        attachment_url: orderData.attachment_url || null,
        customer_locale: orderData.customer_locale || null,
      }, { transaction: t });

      const itemsPayload = (orderData.items || []).map(i => ({
        order_id: created.id,
        menu_id: i.menu_id,
        customizations: i.customizations,
        quantity: i.quantity,
        price: i.price,
      }));
      
      if (itemsPayload.length > 0) {
        await OrderItemModel.bulkCreate(itemsPayload, { transaction: t });
      }

      const full = await OrderModel.findByPk(created.id, {
        include: [{
          model: OrderItemModel,
          as: 'items',
          include: [{ model: MenuModel, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
        }],
        transaction: t,
      });

      const plain = full.get({ plain: true });
      const items = (plain.items || []).map(oi => ({
        id: oi.id,
        menu_id: oi.menu_id,
        menu_name: oi.menu?.name_en,
        menu_name_th: oi.menu?.name_th,
        menu_description: oi.menu?.description_en,
        menu_description_th: oi.menu?.description_th,
        image_url: oi.menu?.image_url,
        customizations: oi.customizations,
        quantity: oi.quantity,
        price: oi.price,
      }));
      const shaped = { ...plain, items };
      return this.addLocalizedFields(shaped, shaped.customer_locale || DEFAULT_LOCALE);
    });
  }

  /**
   * @param {number|string} id
   * @param {string|null} [locale]
   * @returns {Promise<OrderDTO|null>}
   */
  static async findById(id, locale = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel, Menu: MenuModel } } = orm;
    const order = await OrderModel.findByPk(id, {
      include: [{
        model: OrderItemModel,
        as: 'items',
        include: [{ model: MenuModel, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
      }]
    });
    if (!order) return null;
    const plain = order.get({ plain: true });
    const items = (plain.items || []).map(oi => ({
      id: oi.id,
      menu_id: oi.menu_id,
      menu_name: oi.menu?.name_en,
      menu_name_th: oi.menu?.name_th,
      menu_description: oi.menu?.description_en,
      menu_description_th: oi.menu?.description_th,
      image_url: oi.menu?.image_url,
      customizations: oi.customizations,
      quantity: oi.quantity,
      price: oi.price,
    }));
    const shaped = { ...plain, items };
    const orderLocale = locale || shaped.customer_locale || DEFAULT_LOCALE;
    return this.addLocalizedFields(shaped, orderLocale);
  }

  /**
   * @param {{status?:string,customer_id?:string|number,date?:string}} [filters]
   * @param {string} [sortBy]
   * @param {'ASC'|'DESC'|string} [sortOrder]
   * @param {string|null} [locale]
   * @returns {Promise<OrderDTO[]>}
   */
  static async findAll(filters = {}, sortBy = 'created_at', sortOrder = 'DESC', locale = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel, Menu: MenuModel } } = orm;
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.customer_id) where.customer_id = filters.customer_id;
    if (filters.date) {
      const start = new Date(filters.date + 'T00:00:00.000Z');
      const end = new Date(filters.date + 'T23:59:59.999Z');
      where.created_at = { [Op.between]: [start, end] };
    }
    const safeSortBy = ['created_at', 'updated_at', 'total', 'status'].includes(sortBy) ? sortBy : 'created_at';
    const orders = await OrderModel.findAll({
      where,
      include: [{
        model: OrderItemModel,
        as: 'items',
        include: [{ model: MenuModel, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
      }],
      // Order by base model column without alias to avoid association lookup errors
      order: [[safeSortBy, sortOrder && String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
    });
    return orders.map(o => {
      const plain = o.get({ plain: true });
      const items = (plain.items || []).map(oi => ({
        id: oi.id,
        menu_id: oi.menu_id,
        menu_name: oi.menu?.name_en,
        menu_name_th: oi.menu?.name_th,
        menu_description: oi.menu?.description_en,
        menu_description_th: oi.menu?.description_th,
        image_url: oi.menu?.image_url,
        customizations: oi.customizations,
        quantity: oi.quantity,
        price: oi.price,
      }));
      const shaped = { ...plain, items };
    const orderLocale = locale || shaped.customer_locale || DEFAULT_LOCALE;
      return this.addLocalizedFields(shaped, orderLocale);
    });
  }

  /**
   * @param {number|string} id
   * @param {string} status
   * @returns {Promise<{id:number,status:string,created_at?:string,updated_at?:string,total?:Decimalish,customer_info?:Record<string,any>,notes?:string|null}|null>}
   */
  static async updateStatus(id, status) {
    const { sequelize, models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;
    return await sequelize.transaction(async (t) => {
      try {
        // Minimal ORM path without joins to avoid schema drift issues
        const existing = await OrderModel.findByPk(id, {
          attributes: ['id', 'status'],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!existing) return null;
        const fromStatus = existing.status;
        const toStatus = status;

        // If moving to cancelled from a non-cancelled state, restore stock
        if (toStatus === ORDER_STATUS.CANCELLED && fromStatus !== ORDER_STATUS.CANCELLED) {
          const orderItems = await OrderItemModel.findAll({
            attributes: ['menu_id', 'quantity'],
            where: { order_id: id },
            transaction: t,
          });
          const items = orderItems.map(i => ({ menu_id: i.menu_id, quantity: i.quantity }));
          if (items.length) await Inventory.restoreStockForOrder(items, t);
        }

        await existing.update({ status: toStatus }, { transaction: t });
        return existing.get({ plain: true });
      } catch (ormErr) {
        // Fallback: raw SQL to handle any model/column mismatch
        const [rows] = await sequelize.query(
          'SELECT id, status FROM orders WHERE id = :id FOR UPDATE',
          { transaction: t, replacements: { id } }
        );
        if (!rows || rows.length === 0) return null;
        const fromStatus = rows[0].status;
        const toStatus = status;

        if (toStatus === ORDER_STATUS.CANCELLED && fromStatus !== ORDER_STATUS.CANCELLED) {
          const orderItems = await OrderItemModel.findAll({
            attributes: ['menu_id', 'quantity'],
            where: { order_id: id },
            transaction: t,
          });
          const items = orderItems.map(i => ({ menu_id: i.menu_id, quantity: i.quantity }));
          if (items.length) await Inventory.restoreStockForOrder(items, t);
        }

        await sequelize.query(
          'UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id',
          { transaction: t, replacements: { id, status: toStatus } }
        );

        // Prefer "notes" (plural); fallback to "note" if present
        try {
          const [afterRowsPref] = await sequelize.query(
            'SELECT id, status, created_at, updated_at, total, customer_info, notes FROM orders WHERE id = :id',
            { transaction: t, replacements: { id } }
          );
          if (afterRowsPref && afterRowsPref[0]) return afterRowsPref[0];
        } catch (_) {
          const [afterRowsAlt] = await sequelize.query(
            'SELECT id, status, created_at, updated_at, total, customer_info, note AS notes FROM orders WHERE id = :id',
            { transaction: t, replacements: { id } }
          );
          if (afterRowsAlt && afterRowsAlt[0]) return afterRowsAlt[0];
        }
        return { id: Number(id), status: toStatus };
      }
    });
  }

  /**
   * @param {number|string} id
   * @param {Object} orderData
   * @param {string|null} [orderData.customer_id]
   * @param {Record<string, any>} orderData.customer_info
   * @param {Decimalish} orderData.total
   * @param {Decimalish} [orderData.discount_amount]
   * @param {string|null} [orderData.notes]
   * @param {Array<{menu_id:number, quantity:number, price:Decimalish, customizations?:Record<string, any>}>} orderData.items
   * @returns {Promise<OrderDTO>}
   */
  static async update(id, orderData) {
    const { sequelize, models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;
    return await sequelize.transaction(async (t) => {
      // Load existing items for delta calculation
      const existing = await OrderModel.findByPk(id, { include: [{ model: OrderItemModel, as: 'items' }], transaction: t, lock: t.LOCK.UPDATE });
      if (!existing) throw new Error('Order not found');

      const oldCounts = new Map();
      for (const it of (existing.items || [])) {
        const key = it.menu_id;
        oldCounts.set(key, (oldCounts.get(key) || 0) + Number(it.quantity || 0));
      }
      const newCounts = new Map();
      for (const it of (orderData.items || [])) {
        const key = it.menu_id;
        newCounts.set(key, (newCounts.get(key) || 0) + Number(it.quantity || 0));
      }

      const menuIds = new Set([...oldCounts.keys(), ...newCounts.keys()]);
      const toDeduct = [];
      const toRestore = [];
      for (const menuId of menuIds) {
        const before = oldCounts.get(menuId) || 0;
        const after = newCounts.get(menuId) || 0;
        const delta = after - before;
        if (delta > 0) toDeduct.push({ menu_id: menuId, quantity: delta });
        else if (delta < 0) toRestore.push({ menu_id: menuId, quantity: -delta });
      }

      // Apply inventory adjustments first to fail fast if insufficient stock
      if (toRestore.length) {
        await Inventory.restoreStockForOrder(toRestore, t);
      }
      if (toDeduct.length) {
        await Inventory.checkAndDeductStockForOrder(toDeduct, t);
      }

      // Update order header
      await existing.update({
        customer_id: orderData.customer_id || null,
        customer_info: orderData.customer_info,
        total: orderData.total,
        discount_amount: orderData.discount_amount || 0,
        notes: orderData.notes || null,
        attachment_url: orderData.attachment_url || null,
      }, { transaction: t });

      // Replace items
      await OrderItemModel.destroy({ where: { order_id: id }, transaction: t });
      const itemsPayload = (orderData.items || []).map(i => ({
        order_id: id,
        menu_id: i.menu_id,
        customizations: i.customizations,
        quantity: i.quantity,
        price: i.price,
      }));
      if (itemsPayload.length > 0) {
        await OrderItemModel.bulkCreate(itemsPayload, { transaction: t });
      }
      return await Order.findById(id);
    });
  }

  /**
   * @param {number|string} id
   * @returns {Promise<OrderDTO|null>}
   */
  static async delete(id) {
    const { sequelize, models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;
    return await sequelize.transaction(async (t) => {
      // Fetch order with items for stock restoration
      const existing = await OrderModel.findByPk(id, { include: [{ model: OrderItemModel, as: 'items' }], transaction: t, lock: t.LOCK.UPDATE });
      if (!existing) return null;

      // If order is not cancelled, restore stock before delete
      if (existing.status !== ORDER_STATUS.CANCELLED) {
        const items = (existing.items || []).map(i => ({ menu_id: i.menu_id, quantity: i.quantity }));
        if (items.length) {
          await Inventory.restoreStockForOrder(items, t);
        }
      }

      // Capture plain to return
      const plain = existing.get({ plain: true });
      await OrderModel.destroy({ where: { id }, transaction: t });
      return plain;
    });
  }

  /**
   * @returns {Promise<{ total_orders:number, total_revenue:number, completed_orders:number, pending_orders:number }>}
   */
  static async getTodaySales() {
    const { models: { Order: OrderModel } } = orm;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const where = { created_at: { [Op.between]: [start, end] } };
    const [total_orders, total_revenue, completed_orders, pending_orders] = await Promise.all([
      OrderModel.count({ where }),
      OrderModel.sum('total', { where }).then(v => v || 0),
      OrderModel.count({ where: { ...where, status: ORDER_STATUS.COMPLETED } }),
      OrderModel.count({ where: { ...where, status: ORDER_STATUS.PENDING } }),
    ]);
    return { total_orders, total_revenue, completed_orders, pending_orders };
  }

  /**
   * @param {string|null} [startDate]
   * @param {string|null} [endDate]
   * @param {string} [locale]
   * @returns {Promise<{ summary: Record<string, Decimalish>, daily_breakdown: Array<Record<string, Decimalish>> }>}
   */
  static async getSalesInsights(startDate = null, endDate = null, locale = DEFAULT_LOCALE) {
    const { models: { Order: OrderModel } } = orm;
    // Build optional date range: if no dates provided, return all-time (no where clause)
    let start = null, end = null, whereRange = undefined;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
      whereRange = { created_at: { [Op.between]: [start, end] } };
    } else if (startDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date();
      whereRange = { created_at: { [Op.between]: [start, end] } };
    } else if (endDate) {
      // All up to endDate (inclusive)
      end = new Date(endDate + 'T23:59:59.999Z');
      whereRange = { created_at: { [Op.lte]: end } };
    }

    const daily = await OrderModel.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'day', col('created_at')), 'order_date'],
        [fn('COUNT', col('id')), 'total_orders'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'total_revenue'],
        [fn('COALESCE', fn('AVG', col('total')), 0), 'average_order_value'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.COMPLETED}' THEN 1 ELSE 0 END`)), 'completed_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.PENDING}' THEN 1 ELSE 0 END`)), 'pending_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.PREPARING}' THEN 1 ELSE 0 END`)), 'preparing_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.READY}' THEN 1 ELSE 0 END`)), 'ready_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.CANCELLED}' THEN 1 ELSE 0 END`)), 'cancelled_orders'],
        [fn('COALESCE', fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.COMPLETED}' THEN total END`)), 0), 'completed_revenue'],
      ],
      ...(whereRange ? { where: whereRange } : {}),
      group: [literal("DATE_TRUNC('day', created_at)")],
      order: [[literal("DATE_TRUNC('day', created_at)"), 'DESC']],
      raw: true,
    });

    const summaryRaw = await OrderModel.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'total_orders'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'total_revenue'],
        [fn('COALESCE', fn('AVG', col('total')), 0), 'average_order_value'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.COMPLETED}' THEN 1 ELSE 0 END`)), 'completed_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.PENDING}' THEN 1 ELSE 0 END`)), 'pending_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.PREPARING}' THEN 1 ELSE 0 END`)), 'preparing_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.READY}' THEN 1 ELSE 0 END`)), 'ready_orders'],
        [fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.CANCELLED}' THEN 1 ELSE 0 END`)), 'cancelled_orders'],
        [fn('COALESCE', fn('SUM', literal(`CASE WHEN status = '${ORDER_STATUS.COMPLETED}' THEN total END`)), 0), 'completed_revenue'],
      ],
      ...(whereRange ? { where: whereRange } : {}),
      raw: true,
    });
    const summary = summaryRaw[0] || {};

    return { summary, daily_breakdown: daily };
  }

  /**
   * Get hourly sales breakdown for a specific day.
   * Aggregates total items sold, number of orders, and revenue per hour (0-23).
   *
   * @param {string|null} dateStr - Target date in YYYY-MM-DD (defaults to today if null)
   * @returns {Promise<Array<{hour:number, items_sold:number, orders_count:number, revenue:number}>>}
   */
  static async getHourlySalesByDay(dateStr = null, tzArg = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;

    // Resolve day range
    let baseDate;
    if (dateStr) {
      baseDate = new Date(dateStr + 'T00:00:00.000Z');
    } else {
      baseDate = new Date();
    }
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(23, 59, 59, 999);

    // Query aggregates grouped by hour
    const rows = await OrderModel.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'hour', col('orders.created_at')), 'hour_bucket'],
        [fn('COALESCE', fn('SUM', col('items.quantity')), 0), 'items_sold'],
        [fn('COUNT', fn('DISTINCT', col('orders.id'))), 'orders_count'],
        [fn('COALESCE', fn('SUM', literal('"items"."price" * "items"."quantity"')), 0), 'revenue'],
      ],
      where: { created_at: { [Op.between]: [start, end] } },
      include: [{ model: OrderItemModel, as: 'items', attributes: [] }],
      group: [literal('DATE_TRUNC(\'hour\', "orders"."created_at")')],
      order: [[literal('DATE_TRUNC(\'hour\', "orders"."created_at")'), 'ASC']],
      raw: true,
    });

    // Initialize 24 slots with zeros
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      items_sold: 0,
      orders_count: 0,
      revenue: 0, 
    }));

    // Map DB rows to hourly slots
    for (const r of rows) {
      let hourIndex = 0;
      try {
        const ts = new Date(r.hour_bucket);
        if (!Number.isNaN(ts.getTime())) hourIndex = ts.getHours();
        else {
          // Fallback parse: 'YYYY-MM-DDTHH:mm:ss' -> HH
          const hh = String(r.hour_bucket).split('T')[1]?.slice(0, 2);
          hourIndex = Number(hh) || 0;
        }
      } catch (_) { /* noop */ }

      if (hourIndex >= 0 && hourIndex < 24) {
        hourly[hourIndex].items_sold = parseInt(r.items_sold, 10) || 0;
        hourly[hourIndex].orders_count = parseInt(r.orders_count, 10) || 0;
        hourly[hourIndex].revenue = parseFloat(r.revenue) || 0;
      }
    }

    return hourly;
  }

  /**
   * Get hourly-of-day sales aggregated over a period (or all-time).
   * Groups by hour 0-23 across the entire range, summing items and revenue.
   *
   * @param {string|null} startDate - YYYY-MM-DD inclusive start (optional)
   * @param {string|null} endDate - YYYY-MM-DD inclusive end (optional)
   * @returns {Promise<Array<{hour:number, items_sold:number, orders_count:number, revenue:number}>>}
   */
  static async getHourlySalesByPeriod(startDate = null, endDate = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;

    // Build optional date range: if none provided, compute all-time
    let whereRange = undefined;
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      whereRange = { created_at: { [Op.between]: [start, end] } };
    } else if (startDate) {
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date();
      whereRange = { created_at: { [Op.between]: [start, end] } };
    } else if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z');
      whereRange = { created_at: { [Op.lte]: end } };
    }

    const rows = await OrderModel.findAll({
      attributes: [
        [fn('DATE_PART', 'hour', col('orders.created_at')), 'hour_num'],
        [fn('COALESCE', fn('SUM', col('items.quantity')), 0), 'items_sold'],
        [fn('COUNT', fn('DISTINCT', col('orders.id'))), 'orders_count'],
        [fn('COALESCE', fn('SUM', literal('"items"."price" * "items"."quantity"')), 0), 'revenue'],
      ],
      ...(whereRange ? { where: whereRange } : {}),
      include: [{ model: OrderItemModel, as: 'items', attributes: [] }],
      group: [literal('DATE_PART(\'hour\', "orders"."created_at")')],
      order: [[literal('DATE_PART(\'hour\', "orders"."created_at")'), 'ASC']],
      raw: true,
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, items_sold: 0, orders_count: 0, revenue: 0 }));
    for (const r of rows) {
      const hourIndex = parseInt(r.hour_num, 10);
      if (hourIndex >= 0 && hourIndex < 24) {
        hourly[hourIndex].items_sold = parseInt(r.items_sold, 10) || 0;
        hourly[hourIndex].orders_count = parseInt(r.orders_count, 10) || 0;
        hourly[hourIndex].revenue = parseFloat(r.revenue) || 0;
      }
    }
    return hourly;
  }

  /**
   * @param {string|null} [startDate]
   * @param {string|null} [endDate]
   * @param {number} [limit]
   * @param {string} [locale]
   * @returns {Promise<Array<{menu_id:number,menu_name:string,category:string,base_price:number,image_url:string|null,total_quantity_sold:number,number_of_orders:number,total_revenue:number,average_price:number,percentage_of_total_sales:number}>>}
   */
  static async getTopSellingItems(startDate = null, endDate = null, limit = TOP_ITEMS_LIMITS.DEFAULT, locale = DEFAULT_LOCALE) {
    const { models: { Order, OrderItem, Menu } } = orm;
    // Build optional date range for orders; if none, compute all-time
    let start = null, end = null, orderWhere = undefined;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
      orderWhere = { created_at: { [Op.between]: [start, end] } };
    } else if (startDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date();
      orderWhere = { created_at: { [Op.between]: [start, end] } };
    } else if (endDate) {
      end = new Date(endDate + 'T23:59:59.999Z');
      orderWhere = { created_at: { [Op.lte]: end } };
    }

    const totalQuantity = await OrderItem.sum('quantity', {
      include: [{
        model: Order,
        required: true,
        attributes: [], // prevent selecting order.* to avoid GROUP BY issues in aggregates
        ...(orderWhere ? { where: orderWhere } : {}),
      }],
    }) || 0;

    const rows = await OrderItem.findAll({
      attributes: [
        'menu_id',
        [fn('SUM', col('quantity')), 'total_quantity_sold'],
        [fn('COUNT', fn('DISTINCT', col('order_id'))), 'number_of_orders'],
        [fn('SUM', literal('price * quantity')), 'total_revenue'],
        [fn('AVG', col('price')), 'average_price'],
      ],
      include: [
        {
          model: Order,
          required: true,
          attributes: [], // do not select order columns when aggregating
          ...(orderWhere ? { where: orderWhere } : {}),
        },
        { model: Menu, as: 'menu', attributes: ['base_price', 'image_url', 'name_en', 'name_th', 'category_en', 'category_th'] }
      ],
      group: ['menu_id', 'menu.id', 'menu.base_price', 'menu.image_url', 'menu.name_en', 'menu.name_th', 'menu.category_en', 'menu.category_th'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: Math.min(Math.max(parseInt(limit) || 10, 1), 100),
      raw: true,
    });

    return rows.map(r => ({
      menu_id: r.menu_id,
      menu_name: locale === 'th' ? (r['menu.name_th'] || r['menu.name_en']) : r['menu.name_en'],
      category: locale === 'th' ? (r['menu.category_th'] || r['menu.category_en']) : r['menu.category_en'],
      base_price: parseFloat(r['menu.base_price']),
      image_url: r['menu.image_url'],
      total_quantity_sold: parseInt(r.total_quantity_sold, 10),
      number_of_orders: parseInt(r.number_of_orders, 10),
      total_revenue: parseFloat(r.total_revenue),
      average_price: parseFloat(r.average_price),
      percentage_of_total_sales: totalQuantity ? Math.round((parseInt(r.total_quantity_sold, 10) * 10000) / totalQuantity) / 100 : 0,
    }));
  }

  /**
   * Hourly sales for a specific local day (timezone-aware).
   * @param {string|null} dateStr - YYYY-MM-DD of the local day
   * @param {string|null} tzArg - IANA timezone (e.g., Asia/Bangkok) or offset (+07:00)
   * @returns {Promise<Array<{hour:number, items_sold:number, orders_count:number, revenue:number}>>}
   */
  static async getHourlySalesByDayLocal(dateStr = null, tzArg = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;
    const tzRaw = tzArg || process.env.APP_TIMEZONE || 'UTC';
    const tz = /^[A-Za-z0-9_\/+\-:]+$/.test(tzRaw) ? tzRaw : 'UTC';
    const targetDate = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

    const hourExpr = literal(`DATE_PART('hour', (("orders"."created_at" AT TIME ZONE 'UTC') AT TIME ZONE '${tz}'))`);
    const localDateExpr = literal(`(("orders"."created_at" AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')::date`);

    const rows = await OrderModel.findAll({
      attributes: [
        [hourExpr, 'hour_num'],
        [fn('COALESCE', fn('SUM', col('items.quantity')), 0), 'items_sold'],
        [fn('COUNT', fn('DISTINCT', col('orders.id'))), 'orders_count'],
        [fn('COALESCE', fn('SUM', literal('"items"."price" * "items"."quantity"')), 0), 'revenue'],
      ],
      where: sqWhere(localDateExpr, Op.eq, targetDate),
      include: [{ model: OrderItemModel, as: 'items', attributes: [] }],
      group: [hourExpr],
      order: [[hourExpr, 'ASC']],
      raw: true,
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, items_sold: 0, orders_count: 0, revenue: 0 }));
    for (const r of rows) {
      const hourIndex = parseInt(r.hour_num, 10) || 0;
      if (hourIndex >= 0 && hourIndex < 24) {
        hourly[hourIndex].items_sold = parseInt(r.items_sold, 10) || 0;
        hourly[hourIndex].orders_count = parseInt(r.orders_count, 10) || 0;
        hourly[hourIndex].revenue = parseFloat(r.revenue) || 0;
      }
    }
    return hourly;
  }

  /**
   * Hourly-of-day sales aggregated over a local period (timezone-aware).
   * @param {string|null} startDate - YYYY-MM-DD local start date (inclusive)
   * @param {string|null} endDate - YYYY-MM-DD local end date (inclusive)
   * @param {string|null} tzArg - IANA timezone or offset
   */
  static async getHourlySalesByPeriodLocal(startDate = null, endDate = null, tzArg = null) {
    const { models: { Order: OrderModel, OrderItem: OrderItemModel } } = orm;
    const tzRaw = tzArg || process.env.APP_TIMEZONE || 'UTC';
    const tz = /^[A-Za-z0-9_\/+\-:]+$/.test(tzRaw) ? tzRaw : 'UTC';

    const localDateExpr = literal(`(("orders"."created_at" AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')::date`);
    const andConds = [];
    if (startDate) andConds.push(sqWhere(localDateExpr, Op.gte, startDate));
    if (endDate) andConds.push(sqWhere(localDateExpr, Op.lte, endDate));

    const hourExpr = literal(`DATE_PART('hour', (("orders"."created_at" AT TIME ZONE 'UTC') AT TIME ZONE '${tz}'))`);

    const rows = await OrderModel.findAll({
      attributes: [
        [hourExpr, 'hour_num'],
        [fn('COALESCE', fn('SUM', col('items.quantity')), 0), 'items_sold'],
        [fn('COUNT', fn('DISTINCT', col('orders.id'))), 'orders_count'],
        [fn('COALESCE', fn('SUM', literal('"items"."price" * "items"."quantity"')), 0), 'revenue'],
      ],
      ...(andConds.length ? { where: { [Op.and]: andConds } } : {}),
      include: [{ model: OrderItemModel, as: 'items', attributes: [] }],
      group: [hourExpr],
      order: [[hourExpr, 'ASC']],
      raw: true,
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, items_sold: 0, orders_count: 0, revenue: 0 }));
    for (const r of rows) {
      const hourIndex = parseInt(r.hour_num, 10) || 0;
      if (hourIndex >= 0 && hourIndex < 24) {
        hourly[hourIndex].items_sold = parseInt(r.items_sold, 10) || 0;
        hourly[hourIndex].orders_count = parseInt(r.orders_count, 10) || 0;
        hourly[hourIndex].revenue = parseFloat(r.revenue) || 0;
      }
    }
    return hourly;
  }

  /**
   * @param {any} order
   * @param {string} [locale]
   * @returns {OrderDTO}
   */
  static addLocalizedFields(order, locale = DEFAULT_LOCALE) {
    if (!order) return order;
    
    const localization = require('../utils/localization');
    const localized = { ...order };

    // Normalize timestamps to ISO strings to ensure they survive any deep-clone/serialization
    try {
      const c = order.created_at;
      if (c) {
        if (c instanceof Date) localized.created_at = c.toISOString();
        else if (typeof c?.toISOString === 'function') localized.created_at = c.toISOString();
        else if (typeof c === 'string') localized.created_at = c; // assume ISO already
      }
    } catch (_) { /* noop */ }
    try {
      const u = order.updated_at;
      if (u) {
        if (u instanceof Date) localized.updated_at = u.toISOString();
        else if (typeof u?.toISOString === 'function') localized.updated_at = u.toISOString();
        else if (typeof u === 'string') localized.updated_at = u;
      }
    } catch (_) { /* noop */ }
    
    // Set localized status directly
    localized.status = localization.getOrderStatusTranslation(order.status, locale);
    
    // Notes: use single 'notes' field (DB does not have notes_th)
    localized.notes = order.notes || null;
    
    // Localize order items
    if (order.items && Array.isArray(order.items)) {
      localized.items = order.items.map(item => {
        const localizedItem = { ...item };
        
        // Set localized menu name directly
        if (locale === 'th' && item.menu_name_th) {
          localizedItem.menu_name = item.menu_name_th;
        } else {
          localizedItem.menu_name = item.menu_name;
        }
        
        // Set localized menu description directly
        if (locale === 'th' && item.menu_description_th) {
          localizedItem.menu_description = item.menu_description_th;
        } else if (item.menu_description) {
          localizedItem.menu_description = item.menu_description;
        } else {
          localizedItem.menu_description = null;
        }
        
        // Remove individual language fields
        delete localizedItem.menu_name_th;
        
        return localizedItem;
      });
    }
    
    return localized;
  }
}

module.exports = Order;
