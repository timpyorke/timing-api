const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert order
      const orderQuery = `
        INSERT INTO orders (customer_info, status, total)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_info,
        'pending',
        orderData.total
      ]);
      
      const order = orderResult.rows[0];
      
      // Insert order items
      for (const item of orderData.items) {
        const itemQuery = `
          INSERT INTO order_items (order_id, beverage_id, customizations, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(itemQuery, [
          order.id,
          item.beverage_id,
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
              'beverage_id', oi.beverage_id,
              'beverage_name', b.name,
              'customizations', oi.customizations,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN beverages b ON oi.beverage_id = b.id
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
              'beverage_id', oi.beverage_id,
              'beverage_name', b.name,
              'customizations', oi.customizations,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN beverages b ON oi.beverage_id = b.id
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
}

module.exports = Order;