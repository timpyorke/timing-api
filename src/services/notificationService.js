const { messaging } = require('../config/firebase');
const FcmToken = require('../models/FcmToken');

class NotificationService {
  static async sendOrderNotification(order) {
    try {
      // Validate order object
      if (!order) {
        console.error('Order object is null or undefined');
        throw new Error('Order object is required');
      }

      if (!order.id) {
        console.error('Order object missing required id property:', order);
        throw new Error('Order must have an id property');
      }

      if (!order.total) {
        console.error('Order object missing required total property:', order);
        throw new Error('Order must have a total property');
      }

      // Get all FCM tokens
      const tokens = await FcmToken.getAll();
      
      if (tokens.length === 0) {
        console.log('No FCM tokens found');
        return;
      }

      // Safely extract customer info
      const customerName = order.customer_info && order.customer_info.name ? order.customer_info.name : 'Customer';
      const orderTotal = parseFloat(order.total) || 0;

      const notification = {
        title: 'New Order Received',
        body: `Order #${order.id} - ${customerName} - $${orderTotal.toFixed(2)}`
      };

      const data = {
        type: 'new_order',
        order_id: order.id.toString(),
        customer_name: customerName,
        total: orderTotal.toString(),
        created_at: order.created_at ? order.created_at.toString() : new Date().toISOString()
      };

      // Filter out invalid tokens before sending
      const validTokens = tokens.filter(token => 
        token && 
        typeof token === 'string' && 
        token.length > 10 && 
        !token.startsWith('test_') &&
        !token.includes('dummy')
      );

      if (validTokens.length === 0) {
        console.log('No valid FCM tokens found after filtering');
        return { successCount: 0, failureCount: 0, responses: [] };
      }

      console.log(`Sending notification to ${validTokens.length} valid tokens (filtered from ${tokens.length} total)`);

      let response;
      if (validTokens.length === 1) {
        // Use single message send for one token
        const message = {
          notification,
          data,
          token: validTokens[0]
        };
        try {
          const singleResponse = await messaging.send(message);
          response = {
            successCount: 1,
            failureCount: 0,
            responses: [{ success: true, messageId: singleResponse }]
          };
        } catch (error) {
          console.log('Single token send failed:', error.code, error.message);
          response = {
            successCount: 0,
            failureCount: 1,
            responses: [{ success: false, error: error }]
          };
          
          // Remove invalid token if it's a registration error
          if (error.code === 'messaging/registration-token-not-registered' || 
              error.code === 'messaging/invalid-registration-token') {
            console.log('Removing invalid token from database:', validTokens[0].substring(0, 20) + '...');
            try {
              await FcmToken.remove(validTokens[0]);
            } catch (dbError) {
              console.error('Error removing invalid token:', dbError.message);
            }
          }
        }
      } else {
        // Use multicast for multiple tokens
        const message = {
          notification,
          data,
          tokens: validTokens
        };
        try {
          response = await messaging.sendMulticast(message);
          
          // Clean up invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success && 
                  (resp.error.code === 'messaging/registration-token-not-registered' ||
                   resp.error.code === 'messaging/invalid-registration-token')) {
                invalidTokens.push(validTokens[idx]);
              }
            });
            
            if (invalidTokens.length > 0) {
              console.log(`Removing ${invalidTokens.length} invalid tokens from database`);
              for (const token of invalidTokens) {
                try {
                  await FcmToken.remove(token);
                } catch (dbError) {
                  console.error('Error removing invalid token:', dbError.message);
                }
              }
            }
          }
        } catch (error) {
          console.log('Multicast send failed:', error.code, error.message);
          throw error;
        }
      }
      
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
      // Validate order object
      if (!order) {
        console.error('Order object is null or undefined');
        throw new Error('Order object is required');
      }

      if (!order.id) {
        console.error('Order object missing required id property:', order);
        throw new Error('Order must have an id property');
      }

      if (!newStatus) {
        console.error('New status is required');
        throw new Error('New status is required');
      }

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