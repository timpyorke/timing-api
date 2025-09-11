const { ORDER_STATUS, DEFAULT_LOCALE, DAY_MS, DEFAULT_ANALYTICS_LOOKBACK_DAYS, TOP_ITEMS_LIMITS } = require('../utils/constants');
const { Op, fn, col, literal } = require('sequelize');
const orm = require('../orm');
const Inventory = require('./Inventory');

class Order {
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
        notes: orderData.notes || null,
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

  static async getSalesInsights(startDate = null, endDate = null, locale = DEFAULT_LOCALE) {
    const { models: { Order: OrderModel } } = orm;
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
    } else if (startDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date();
    } else {
      end = new Date();
      start = new Date(end.getTime() - DEFAULT_ANALYTICS_LOOKBACK_DAYS * DAY_MS);
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
      where: { created_at: { [Op.between]: [start, end] } },
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
      where: { created_at: { [Op.between]: [start, end] } },
      raw: true,
    });
    const summary = summaryRaw[0] || {};

    return { summary, daily_breakdown: daily };
  }

  static async getTopSellingItems(startDate = null, endDate = null, limit = TOP_ITEMS_LIMITS.DEFAULT, locale = DEFAULT_LOCALE) {
    const { models: { Order, OrderItem, Menu } } = orm;
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
    } else if (startDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date();
    } else {
      end = new Date();
      start = new Date(end.getTime() - DEFAULT_ANALYTICS_LOOKBACK_DAYS * DAY_MS);
    }

    const totalQuantity = await OrderItem.sum('quantity', {
      include: [{
        model: Order,
        required: true,
        attributes: [], // prevent selecting order.* to avoid GROUP BY issues in aggregates
        where: { created_at: { [Op.between]: [start, end] } },
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
          where: { created_at: { [Op.between]: [start, end] } },
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
