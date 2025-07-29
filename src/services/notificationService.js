const { messaging } = require('../config/firebase');
const AdminUser = require('../models/AdminUser');

class NotificationService {
  static async sendOrderNotification(order) {
    try {
      // Get all admin FCM tokens
      const admins = await this.getAllAdminTokens();
      
      if (admins.length === 0) {
        console.log('No admin FCM tokens found');
        return;
      }

      const tokens = admins.map(admin => admin.fcm_token).filter(token => token);
      
      if (tokens.length === 0) {
        console.log('No valid FCM tokens found');
        return;
      }

      const message = {
        notification: {
          title: 'New Order Received',
          body: `Order #${order.id} - ${order.customer_info.name || 'Customer'} - $${order.total}`
        },
        data: {
          type: 'new_order',
          order_id: order.id.toString(),
          customer_name: order.customer_info.name || 'Customer',
          total: order.total.toString(),
          created_at: order.created_at
        },
        tokens: tokens
      };

      const response = await messaging.sendMulticast(message);
      
      console.log('Successfully sent message:', response.successCount, 'messages sent');
      
      if (response.failureCount > 0) {
        console.log('Failed messages:', response.responses
          .map((resp, idx) => resp.success ? null : { token: tokens[idx], error: resp.error })
          .filter(item => item !== null)
        );
      }

      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  static async sendOrderStatusUpdate(order, newStatus) {
    try {
      // This could be used to notify customers if needed
      // For now, we'll just log it
      console.log(`Order ${order.id} status updated to: ${newStatus}`);
      
      // If customer notification is needed later, implement here
      // Similar to admin notification but with customer FCM token
      
      return { success: true };
    } catch (error) {
      console.error('Error sending status update notification:', error);
      throw error;
    }
  }

  static async getAllAdminTokens() {
    // This is a simplified version - in a real app you might want to cache this
    // or implement it differently based on your needs
    try {
      const pool = require('../config/database');
      const query = 'SELECT id, fcm_token FROM admin_users WHERE fcm_token IS NOT NULL';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting admin tokens:', error);
      return [];
    }
  }

  static async testNotification(token, title, body) {
    try {
      const message = {
        notification: {
          title: title || 'Test Notification',
          body: body || 'This is a test notification'
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        },
        token: token
      };

      const response = await messaging.send(message);
      console.log('Test notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;