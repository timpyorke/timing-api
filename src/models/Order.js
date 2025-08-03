const { executeQuery, executeTransaction } = require('../utils/database');
const { ORDER_STATUS } = require('../utils/constants');
const { buildWhereClause, buildOrderByClause } = require('../utils/queryOptimizer');

class Order {
  static async create(orderData) {
    return executeTransaction(async (client) => {
      // Insert order
      const orderQuery = `
        INSERT INTO orders (customer_id, customer_info, status, total)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        orderData.customer_id || null,
        orderData.customer_info,
        ORDER_STATUS.PENDING,
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
      
      return await this.findById(order.id);
    });
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
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}, sortBy = 'created_at', sortOrder = 'DESC') {
    const baseQuery = `
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
    return result.rows;
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
      
      return await this.findById(id);
    });
  }

  static async delete(id) {
    return executeTransaction(async (client) => {
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
}

module.exports = Order;