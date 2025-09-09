const { executeQuery, executeTransaction } = require('../utils/database');
const Inventory = require('./Inventory');
const { ORDER_STATUS } = require('../utils/constants');
const { buildWhereClause, buildOrderByClause } = require('../utils/queryOptimizer');

class Order {
  static async create(orderData) {
    return executeTransaction(async (client) => {
      // Insert order
      const orderQuery = `
        INSERT INTO orders (customer_id, customer_info, status, discount_amount, total, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_id || null,
        orderData.customer_info,
        ORDER_STATUS.PENDING,
        orderData.discount_amount || 0,
        orderData.total,
        orderData.notes || null,
      ]);
      
      const order = orderResult.rows[0];
      
      // Insert order items
      for (const item of orderData.items) {
        const itemQuery = `
          INSERT INTO order_items (order_id, menu_id, customizations, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(itemQuery, [
          order.id,
          item.menu_id,
          item.customizations,
          item.quantity,
          item.price
        ]);
      }

      // Deduct inventory stock for this order
      const minimalItems = orderData.items.map(i => ({ menu_id: i.menu_id, quantity: i.quantity }));
      await Inventory.checkAndDeductStockForOrder(client, minimalItems);
      
      // Get the full order with items using the same transaction client
      const query = `
        SELECT 
          o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'menu_id', oi.menu_id,
                'menu_name', b.name_en,
                'menu_name_th', b.name_th,
                'menu_description', b.description_en,
                'menu_description_th', b.description_th,
                'image_url', b.image_url,
                'customizations', oi.customizations,
                'quantity', oi.quantity,
                'price', oi.price
              )
            ) FILTER (WHERE oi.id IS NOT NULL), 
            '[]'
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menus b ON oi.menu_id = b.id
        WHERE o.id = $1
        GROUP BY o.id
      `;
      const result = await client.query(query, [order.id]);
      const orderWithItems = result.rows[0];
      
      // Add localized fields
      return this.addLocalizedFields(orderWithItems, orderWithItems.customer_locale || 'en');
    });
  }

  static async findById(id, locale = null) {
    const query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_id', oi.menu_id,
              'menu_name', b.name_en,
              'menu_name_th', b.name_th,
              'menu_description', b.description_en,
              'menu_description_th', b.description_th,
              'image_url', b.image_url,
              'customizations', oi.customizations,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menus b ON oi.menu_id = b.id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    const result = await executeQuery(query, [id]);
    const order = result.rows[0];
    
    if (order) {
      // Use provided locale or fallback to customer's locale
      const orderLocale = locale || order.customer_locale || 'en';
      return this.addLocalizedFields(order, orderLocale);
    }
    
    return order;
  }

  static async findAll(filters = {}, sortBy = 'created_at', sortOrder = 'DESC', locale = null) {
    const baseQuery = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_id', oi.menu_id,
              'menu_name', b.name_en,
              'menu_name_th', b.name_th,
              'menu_description', b.description_en,
              'menu_description_th', b.description_th,
              'image_url', b.image_url,
              'customizations', oi.customizations,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menus b ON oi.menu_id = b.id
    `;
    
    // Build WHERE clause using optimizer
    const prefixedFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'status' || key === 'customer_id') {
        prefixedFilters[`o.${key}`] = value;
      } else if (key === 'date') {
        prefixedFilters.date = value; // Special handling in buildWhereClause
      }
    });
    
    const { whereClause, values } = buildWhereClause(prefixedFilters);
    const orderByClause = buildOrderByClause(`o.${sortBy}`, sortOrder, ['created_at', 'updated_at', 'total', 'status']);
    
    const query = `${baseQuery} ${whereClause} GROUP BY o.id ${orderByClause}`;
    
    const result = await executeQuery(query, values);
    
    // Add localized fields to each order
    return result.rows.map(order => {
      const orderLocale = locale || order.customer_locale || 'en';
      return this.addLocalizedFields(order, orderLocale);
    });
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await executeQuery(query, [status, id]);
    return result.rows[0];
  }

  static async update(id, orderData) {
    return executeTransaction(async (client) => {
      // Update order basic info
      const orderQuery = `
        UPDATE orders 
        SET customer_id = $1, customer_info = $2, total = $3, 
            discount_amount = $4, notes = $5, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $6 
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_id || null,
        orderData.customer_info,
        orderData.total,
        orderData.discount_amount || 0,
        orderData.notes || null,
        id
      ]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      // Delete existing order items
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // Insert new order items
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const itemQuery = `
            INSERT INTO order_items (order_id, menu_id, customizations, quantity, price)
            VALUES ($1, $2, $3, $4, $5)
          `;
          await client.query(itemQuery, [
            id,
            item.menu_id,
            item.customizations,
            item.quantity,
            item.price
          ]);
        }
      }
      
      return await Order.findById(id);
    });
  }

  static async delete(id) {
    return executeTransaction(async (client) => {
      // Get order before deletion for return value
      const order = await Order.findById(id);
      if (!order) {
        return null;
      }
      
      // Delete order items first (due to foreign key constraint)
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // Delete order
      const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
      await client.query(query, [id]);
      
      return order; // Return the full order with items
    });
  }

  static async getTodaySales() {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(CASE WHEN status = $1 THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = $2 THEN 1 END) as pending_orders
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const result = await executeQuery(query, [ORDER_STATUS.COMPLETED, ORDER_STATUS.PENDING]);
    return result.rows[0];
  }

  static async getSalesInsights(startDate = null, endDate = null, locale = 'en') {
    let dateCondition = '';
    const values = [];
    
    if (startDate && endDate) {
      dateCondition = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      values.push(startDate, endDate);
    } else if (startDate) {
      dateCondition = 'WHERE DATE(o.created_at) >= $1';
      values.push(startDate);
    } else {
      // Default to last 30 days
      dateCondition = 'WHERE o.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(AVG(o.total), 0) as average_order_value,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN o.status = 'ready' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total END), 0) as completed_revenue,
        DATE_TRUNC('day', o.created_at) as order_date,
        COUNT(*) OVER() as total_period_orders
      FROM orders o
      ${dateCondition}
      GROUP BY DATE_TRUNC('day', o.created_at)
      ORDER BY order_date DESC
    `;
    
    const result = await executeQuery(query, values);
    
    // Calculate summary metrics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(AVG(o.total), 0) as average_order_value,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN o.status = 'ready' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total END), 0) as completed_revenue
      FROM orders o
      ${dateCondition}
    `;
    
    const summaryResult = await executeQuery(summaryQuery, values);
    
    return {
      summary: summaryResult.rows[0],
      daily_breakdown: result.rows
    };
  }

  static async getTopSellingItems(startDate = null, endDate = null, limit = 10, locale = 'en') {
    let dateCondition = '';
    const values = [];
    
    if (startDate && endDate) {
      dateCondition = 'WHERE DATE(o.created_at) BETWEEN $1 AND $2';
      values.push(startDate, endDate);
    } else if (startDate) {
      dateCondition = 'WHERE DATE(o.created_at) >= $1';
      values.push(startDate);
    } else {
      // Default to last 30 days
      dateCondition = 'WHERE o.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    values.push(limit);
    const limitIndex = values.length;

    const menuNameField = locale === 'th' ? 'COALESCE(m.name_th, m.name_en)' : 'm.name_en';
    const categoryField = locale === 'th' ? 'COALESCE(m.category_th, m.category_en)' : 'm.category_en';
    
    const query = `
      SELECT 
        m.id as menu_id,
        ${menuNameField} as menu_name,
        ${categoryField} as category,
        m.base_price,
        m.image_url,
        SUM(oi.quantity) as total_quantity_sold,
        COUNT(DISTINCT o.id) as number_of_orders,
        SUM(oi.price * oi.quantity) as total_revenue,
        AVG(oi.price) as average_price,
        ROUND((SUM(oi.quantity) * 100.0 / SUM(SUM(oi.quantity)) OVER()), 2) as percentage_of_total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menus m ON oi.menu_id = m.id
      ${dateCondition}
      GROUP BY m.id, ${menuNameField}, ${categoryField}, m.base_price, m.image_url
      ORDER BY total_quantity_sold DESC
      LIMIT $${limitIndex}
    `;
    
    const result = await executeQuery(query, values);
    return result.rows;
  }

  static addLocalizedFields(order, locale = 'en') {
    if (!order) return order;
    
    const localization = require('../utils/localization');
    const localized = { ...order };
    
    // Set localized status directly
    localized.status = localization.getOrderStatusTranslation(order.status, locale);
    
    // Set localized notes directly
    if (locale === 'th' && order.notes_th) {
      localized.notes = order.notes_th;
    } else if (order.notes) {
      localized.notes = order.notes;
    } else {
      localized.notes = null;
    }
    
    // Remove individual language fields for notes
    delete localized.notes_th;
    
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
