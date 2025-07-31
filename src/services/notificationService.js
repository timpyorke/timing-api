const { messaging } = require('../config/firebase');
const FcmToken = require('../models/FcmToken');

class NotificationService {
  static async sendOrderNotification(order) {
    try {
      // Get all FCM tokens
      const tokens = await FcmToken.getAll();
      
      if (tokens.length === 0) {
        console.log('No FCM tokens found');
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

  static async getAllTokens() {
    // This is a simplified version - in a real app you might want to cache this
    // or implement it differently based on your needs
    try {
      return await FcmToken.getAll();
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
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