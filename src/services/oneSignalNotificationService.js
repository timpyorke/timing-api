const { onesignalClient, appId } = require('../config/onesignal');
const OneSignalToken = require('../models/OneSignalToken');
const localization = require('../utils/localization');

class OneSignalNotificationService {
  static async sendOrderNotification(order, locale = 'en') {
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

      // Check if OneSignal is configured
      if (!onesignalClient || !appId) {
        console.warn('OneSignal not configured. Skipping notification.');
        return { delivered: 0, errors: [] };
      }

      // Get all OneSignal player IDs
      const playerIds = await OneSignalToken.getAll();
      
      if (playerIds.length === 0) {
        console.log('No OneSignal player IDs found');
        return { delivered: 0, errors: [] };
      }

      // Safely extract customer info
      const customerName = order.customer_info && order.customer_info.name ? order.customer_info.name : 'Customer';
      const orderTotal = parseFloat(order.total) || 0;

      // Get localized notification text
      const notificationText = localization.getNotificationText('new_order', locale, {
        order_id: order.id,
        customer_name: customerName
      });

      // Create OneSignal notification
      const notification = {
        app_id: appId,
        include_player_ids: playerIds,
        headings: {
          en: notificationText.title
        },
        contents: {
          en: `${notificationText.body} - $${orderTotal.toFixed(2)}`
        },
        data: {
          type: 'new_order',
          order_id: order.id.toString(),
          customer_name: customerName,
          total: orderTotal.toString(),
          created_at: order.created_at ? order.created_at.toString() : new Date().toISOString()
        }
      };

      console.log(`Sending OneSignal notification to ${playerIds.length} players`);

      // Send notification
      const response = await onesignalClient.createNotification(notification);
      
      console.log('OneSignal notification sent successfully:', {
        id: response.id,
        recipients: response.recipients,
        errors: response.errors
      });

      // Clean up invalid player IDs if any errors occurred
      if (response.errors && response.errors.invalid_player_ids) {
        const invalidIds = response.errors.invalid_player_ids;
        console.log(`Removing ${invalidIds.length} invalid player IDs from database`);
        
        for (const playerId of invalidIds) {
          try {
            await OneSignalToken.remove(playerId);
          } catch (dbError) {
            console.error('Error removing invalid player ID:', dbError.message);
          }
        }
      }

      return {
        delivered: response.recipients || 0,
        errors: response.errors || []
      };
    } catch (error) {
      console.error('Error sending OneSignal notification:', error);
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
      // Similar to admin notification but with customer player IDs
      
      return { success: true };
    } catch (error) {
      console.error('Error sending status update notification:', error);
      throw error;
    }
  }

  static async getAllPlayerIds() {
    try {
      return await OneSignalToken.getAll();
    } catch (error) {
      console.error('Error getting OneSignal player IDs:', error);
      return [];
    }
  }

  static async testNotification(playerId, title, body) {
    try {
      if (!onesignalClient || !appId) {
        throw new Error('OneSignal not configured');
      }

      const notification = {
        app_id: appId,
        include_player_ids: [playerId],
        headings: {
          en: title || 'Test Notification'
        },
        contents: {
          en: body || 'This is a test notification'
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };

      const response = await onesignalClient.createNotification(notification);
      console.log('Test OneSignal notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending test OneSignal notification:', error);
      throw error;
    }
  }
}

module.exports = OneSignalNotificationService;