const { lineClient } = require('../config/line');
const LineToken = require('../models/LineToken');
const localization = require('../utils/localization');

class LineNotificationService {
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

      // Check if LINE client is configured
      if (!lineClient) {
        console.warn('LINE client not configured. Skipping LINE notification.');
        return { delivered: 0, errors: [] };
      }

      // Get all LINE user IDs
      const lineUserIds = await LineToken.getAll();
      
      if (lineUserIds.length === 0) {
        console.log('No LINE user IDs found');
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

      // Create rich message with order details
      const message = {
        type: 'flex',
        altText: `${notificationText.title} - Order #${order.id}`,
        contents: {
          type: 'bubble',
          styles: {
            footer: {
              separator: true
            }
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🔔 New Order',
                weight: 'bold',
                color: '#1DB446',
                size: 'sm'
              },
              {
                type: 'text',
                text: `Order #${order.id}`,
                weight: 'bold',
                size: 'xxl',
                margin: 'md'
              },
              {
                type: 'text',
                text: `Customer: ${customerName}`,
                size: 'sm',
                color: '#666666',
                margin: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: 'Total:',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: `$${orderTotal.toFixed(2)}`,
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 2,
                        weight: 'bold'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: 'Status:',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: order.status || 'pending',
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: 'Time:',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: new Date(order.created_at || Date.now()).toLocaleString(),
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      };

      console.log(`Sending LINE notification to ${lineUserIds.length} users`);

      let delivered = 0;
      const errors = [];

      // Send notifications to all LINE users
      for (const userId of lineUserIds) {
        try {
          await lineClient.pushMessage(userId, message);
          delivered++;
          console.log(`LINE notification sent to user: ${userId}`);
        } catch (error) {
          console.error(`Failed to send LINE notification to user ${userId}:`, error.message);
          errors.push({
            userId,
            error: error.message
          });

          // Remove invalid user IDs
          if (error.message.includes('Invalid user ID') || error.message.includes('User not found')) {
            try {
              await LineToken.remove(userId);
              console.log(`Removed invalid LINE user ID: ${userId}`);
            } catch (dbError) {
              console.error('Error removing invalid LINE user ID:', dbError.message);
            }
          }
        }
      }

      return {
        delivered,
        errors
      };
    } catch (error) {
      console.error('Error sending LINE notification:', error);
      throw error;
    }
  }

  static async sendOrderStatusUpdate(order, newStatus, locale = 'en') {
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

      // Check if LINE client is configured
      if (!lineClient) {
        console.warn('LINE client not configured. Skipping LINE notification.');
        return { delivered: 0, errors: [] };
      }

      // Get all LINE user IDs
      const lineUserIds = await LineToken.getAll();
      
      if (lineUserIds.length === 0) {
        console.log('No LINE user IDs found for status update');
        return { delivered: 0, errors: [] };
      }

      // Safely extract customer info
      const customerName = order.customer_info && order.customer_info.name ? order.customer_info.name : 'Customer';

      // Status emoji mapping
      const statusEmojis = {
        'pending': '⏳',
        'confirmed': '✅',
        'preparing': '👨‍🍳',
        'ready': '🛎️',
        'completed': '✅',
        'cancelled': '❌'
      };

      const statusEmoji = statusEmojis[newStatus.toLowerCase()] || '📋';

      // Create status update message
      const message = {
        type: 'flex',
        altText: `Order #${order.id} - Status: ${newStatus}`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `${statusEmoji} Order Update`,
                weight: 'bold',
                color: '#1DB446',
                size: 'sm'
              },
              {
                type: 'text',
                text: `Order #${order.id}`,
                weight: 'bold',
                size: 'xl',
                margin: 'md'
              },
              {
                type: 'text',
                text: `Customer: ${customerName}`,
                size: 'sm',
                color: '#666666',
                margin: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'Status:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: newStatus.toUpperCase(),
                    wrap: true,
                    color: '#1DB446',
                    size: 'sm',
                    flex: 2,
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: 'Updated:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: new Date().toLocaleString(),
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 2
                  }
                ]
              }
            ]
          }
        }
      };

      let delivered = 0;
      const errors = [];

      // Send notifications to all LINE users
      for (const userId of lineUserIds) {
        try {
          await lineClient.pushMessage(userId, message);
          delivered++;
          console.log(`LINE status update sent to user: ${userId}`);
        } catch (error) {
          console.error(`Failed to send LINE status update to user ${userId}:`, error.message);
          errors.push({
            userId,
            error: error.message
          });

          // Remove invalid user IDs
          if (error.message.includes('Invalid user ID') || error.message.includes('User not found')) {
            try {
              await LineToken.remove(userId);
              console.log(`Removed invalid LINE user ID: ${userId}`);
            } catch (dbError) {
              console.error('Error removing invalid LINE user ID:', dbError.message);
            }
          }
        }
      }

      return {
        delivered,
        errors
      };
    } catch (error) {
      console.error('Error sending LINE status update:', error);
      throw error;
    }
  }

  static async getAllUserIds() {
    try {
      return await LineToken.getAll();
    } catch (error) {
      console.error('Error getting LINE user IDs:', error);
      return [];
    }
  }

  static async testNotification(userId, title, body) {
    try {
      if (!lineClient) {
        throw new Error('LINE client not configured');
      }

      const message = {
        type: 'text',
        text: `🧪 ${title || 'Test Notification'}\n\n${body || 'This is a test notification from the Timing API bot.'}\n\nTime: ${new Date().toLocaleString()}`
      };

      await lineClient.pushMessage(userId, message);
      console.log('Test LINE notification sent successfully to:', userId);
      return { success: true, userId };
    } catch (error) {
      console.error('Error sending test LINE notification:', error);
      throw error;
    }
  }
}

module.exports = LineNotificationService;