const { ORDER_STATUS } = require('../utils/constants');
const { Op, fn, col, literal } = require('sequelize');
const orm = require('../orm');

class Order {
  static async create(orderData) {
    const { sequelize, models: { Order, OrderItem, Menu } } = orm;
    return await sequelize.transaction(async (t) => {
      const created = await Order.create({
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
        await OrderItem.bulkCreate(itemsPayload, { transaction: t });
      }

      const full = await Order.findByPk(created.id, {
        include: [{
          model: OrderItem,
          as: 'items',
          include: [{ model: Menu, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
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
      return this.addLocalizedFields(shaped, shaped.customer_locale || 'en');
    });
  }

  static async findById(id, locale = null) {
    const { models: { Order, OrderItem, Menu } } = orm;
    const order = await Order.findByPk(id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{ model: Menu, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
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
    const orderLocale = locale || shaped.customer_locale || 'en';
    return this.addLocalizedFields(shaped, orderLocale);
  }

  static async findAll(filters = {}, sortBy = 'created_at', sortOrder = 'DESC', locale = null) {
    const { models: { Order, OrderItem, Menu } } = orm;
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.customer_id) where.customer_id = filters.customer_id;
    if (filters.date) {
      const start = new Date(filters.date + 'T00:00:00.000Z');
      const end = new Date(filters.date + 'T23:59:59.999Z');
      where.created_at = { [Op.between]: [start, end] };
    }
    const orders = await Order.findAll({
      where,
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{ model: Menu, as: 'menu', attributes: ['name_en', 'name_th', 'description_en', 'description_th', 'image_url'] }]
      }],
      order: [[sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
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
      const orderLocale = locale || shaped.customer_locale || 'en';
      return this.addLocalizedFields(shaped, orderLocale);
    });
  }

  static async updateStatus(id, status) {
    const { models: { Order } } = orm;
    await Order.update({ status }, { where: { id } });
    const updated = await Order.findByPk(id);
    return updated ? updated.get({ plain: true }) : null;
  }

  static async update(id, orderData) {
    const { sequelize, models: { Order, OrderItem } } = orm;
    return await sequelize.transaction(async (t) => {
      const [count] = await Order.update({
        customer_id: orderData.customer_id || null,
        customer_info: orderData.customer_info,
        total: orderData.total,
        discount_amount: orderData.discount_amount || 0,
        notes: orderData.notes || null,
      }, { where: { id }, transaction: t });
      if (!count) throw new Error('Order not found');
      await OrderItem.destroy({ where: { order_id: id }, transaction: t });
      const itemsPayload = (orderData.items || []).map(i => ({
        order_id: id,
        menu_id: i.menu_id,
        customizations: i.customizations,
        quantity: i.quantity,
        price: i.price,
      }));
      if (itemsPayload.length > 0) {
        await OrderItem.bulkCreate(itemsPayload, { transaction: t });
      }
      return await Order.findById(id);
    });
  }

  static async delete(id) {
    const { sequelize, models: { Order } } = orm;
    return await sequelize.transaction(async (t) => {
      const order = await Order.findById(id);
      if (!order) return null;
      await Order.destroy({ where: { id }, transaction: t });
      return order;
    });
  }

  static async getTodaySales() {
    const { models: { Order } } = orm;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const where = { created_at: { [Op.between]: [start, end] } };
    const [total_orders, total_revenue, completed_orders, pending_orders] = await Promise.all([
      Order.count({ where }),
      Order.sum('total', { where }).then(v => v || 0),
      Order.count({ where: { ...where, status: ORDER_STATUS.COMPLETED } }),
      Order.count({ where: { ...where, status: ORDER_STATUS.PENDING } }),
    ]);
    return { total_orders, total_revenue, completed_orders, pending_orders };
  }

  static async getSalesInsights(startDate = null, endDate = null, locale = 'en') {
    const { models: { Order } } = orm;
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
    } else if (startDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date();
    } else {
      end = new Date();
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const daily = await Order.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'day', col('created_at')), 'order_date'],
        [fn('COUNT', col('id')), 'total_orders'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'total_revenue'],
        [fn('COALESCE', fn('AVG', col('total')), 0), 'average_order_value'],
        [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed_orders'],
        [fn('SUM', literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pending_orders'],
        [fn('SUM', literal("CASE WHEN status = 'preparing' THEN 1 ELSE 0 END")), 'preparing_orders'],
        [fn('SUM', literal("CASE WHEN status = 'ready' THEN 1 ELSE 0 END")), 'ready_orders'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled_orders'],
        [fn('COALESCE', fn('SUM', literal("CASE WHEN status = 'completed' THEN total END")), 0), 'completed_revenue'],
      ],
      where: { created_at: { [Op.between]: [start, end] } },
      group: [literal("DATE_TRUNC('day', created_at)")],
      order: [[literal("DATE_TRUNC('day', created_at)"), 'DESC']],
      raw: true,
    });

    const summaryRaw = await Order.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'total_orders'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'total_revenue'],
        [fn('COALESCE', fn('AVG', col('total')), 0), 'average_order_value'],
        [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed_orders'],
        [fn('SUM', literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pending_orders'],
        [fn('SUM', literal("CASE WHEN status = 'preparing' THEN 1 ELSE 0 END")), 'preparing_orders'],
        [fn('SUM', literal("CASE WHEN status = 'ready' THEN 1 ELSE 0 END")), 'ready_orders'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled_orders'],
        [fn('COALESCE', fn('SUM', literal("CASE WHEN status = 'completed' THEN total END")), 0), 'completed_revenue'],
      ],
      where: { created_at: { [Op.between]: [start, end] } },
      raw: true,
    });
    const summary = summaryRaw[0] || {};

    return { summary, daily_breakdown: daily };
  }

  static async getTopSellingItems(startDate = null, endDate = null, limit = 10, locale = 'en') {
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
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const totalQuantity = await OrderItem.sum('quantity', {
      include: [{ model: Order, required: true, where: { created_at: { [Op.between]: [start, end] } } }],
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
        { model: Order, required: true, where: { created_at: { [Op.between]: [start, end] } } },
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

  static addLocalizedFields(order, locale = 'en') {
    if (!order) return order;
    
    const localization = require('../utils/localization');
    const localized = { ...order };
    
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
