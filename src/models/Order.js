const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert order
      const orderQuery = `
        INSERT INTO orders (customer_id, customer_info, status, total)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_id || null,
        orderData.customer_info,
        'pending',
        orderData.total
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
      
      await client.query('COMMIT');
      return await this.findById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_id', oi.menu_id,
              'menu_name', b.name,
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
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_id', oi.menu_id,
              'menu_name', b.name,
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
    
    const conditions = [];
    const values = [];
    
    if (filters.status) {
      conditions.push(`o.status = $${values.length + 1}`);
      values.push(filters.status);
    }
    
    if (filters.date) {
      conditions.push(`DATE(o.created_at) = $${values.length + 1}`);
      values.push(filters.date);
    }
    
    if (filters.customer_id) {
      conditions.push(`o.customer_id = $${values.length + 1}`);
      values.push(filters.customer_id);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async update(id, orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update order basic info
      const orderQuery = `
        UPDATE orders 
        SET customer_id = $1, customer_info = $2, total = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_id || null,
        orderData.customer_info,
        orderData.total,
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
      
      await client.query('COMMIT');
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get order before deletion for return value
      const order = await this.findById(id);
      if (!order) {
        return null;
      }
      
      // Delete order items first (due to foreign key constraint)
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // Delete order
      const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
      await client.query(query, [id]);
      
      await client.query('COMMIT');
      return order; // Return the full order with items
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTodaySales() {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getSalesInsights(startDate = null, endDate = null) {
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
    
    const result = await pool.query(query, values);
    
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
    
    const summaryResult = await pool.query(summaryQuery, values);
    
    return {
      summary: summaryResult.rows[0],
      daily_breakdown: result.rows
    };
  }

  static async getTopSellingItems(startDate = null, endDate = null, limit = 10) {
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

    const query = `
      SELECT 
        m.id as menu_id,
        m.name as menu_name,
        m.category,
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
      GROUP BY m.id, m.name, m.category, m.base_price, m.image_url
      ORDER BY total_quantity_sold DESC
      LIMIT $${limitIndex}
    `;
    
    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Order;