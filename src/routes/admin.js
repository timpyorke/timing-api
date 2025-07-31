const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const FcmToken = require('../models/FcmToken');
const NotificationService = require('../services/notificationService');
const { authenticateToken, generateToken } = require('../middleware/auth');
const pool = require('../config/database');
const { 
  validateLogin, 
  validateOrderStatus, 
  validateMenu, 
  validateId,
  validateFcmToken 
} = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only API endpoints (requires authentication)
 */

/**
 * @swagger
 * /api/admin/fcm-token:
 *   post:
 *     summary: Store FCM token for push notifications
 *     description: Stores a Firebase Cloud Messaging token associated with the authenticated user for receiving push notifications. The token is stored separately from user accounts and can be updated multiple times.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FcmTokenRequest'
 *     responses:
 *       200:
 *         description: FCM token stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FcmTokenResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/fcm-token', authenticateToken, validateFcmToken, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    
    // Store FCM token with optional device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    };
    
    const storedToken = await FcmToken.store(fcm_token, req.user.uid, deviceInfo);
    
    res.json({
      success: true,
      data: {
        token_id: storedToken.id,
        user: {
          uid: req.user.uid,
          email: req.user.email,
          email_verified: req.user.email_verified
        }
      },
      message: 'FCM token stored successfully'
    });
  } catch (error) {
    console.error('Error storing FCM token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store FCM token'
    });
  }
});

/**
 * @swagger
 * /api/admin/debug-token:
 *   get:
 *     summary: Debug token validation
 *     description: Validates the Firebase JWT token and returns user information. Useful for debugging authentication issues.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DebugTokenResponse'
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Token verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/debug-token', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug endpoint failed'
    });
  }
});

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders with optional filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, preparing, ready, completed, cancelled]
 *         description: Filter orders by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders by date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const filters = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.date) {
      filters.date = req.query.date;
    }

    const orders = await Order.findAll(filters);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

/**
 * @swagger
 * /api/admin/orders:
 *   post:
 *     summary: Create new order (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: Order created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const orderData = {
      customer_info: req.body.customer_info,
      items: req.body.items,
      total: req.body.total
    };

    // Validate that menu items exist and calculate total
    let calculatedTotal = 0;
    for (const item of orderData.items) {
      const menuItem = await Menu.findById(item.beverage_id);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          error: `Menu item with ID ${item.beverage_id} not found`
        });
      }
      if (!menuItem.active) {
        return res.status(400).json({
          success: false,
          error: `Menu item "${menuItem.name}" is currently unavailable`
        });
      }
      calculatedTotal += parseFloat(item.price) * item.quantity;
    }

    // Verify the total matches (allow small floating point differences)
    if (Math.abs(calculatedTotal - parseFloat(orderData.total)) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Order total does not match item prices'
      });
    }

    // Create the order
    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get specific order by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   put:
 *     summary: Update order (full order update)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: Order updated successfully
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/orders/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Check if order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const orderData = {
      customer_info: req.body.customer_info,
      items: req.body.items,
      total: req.body.total
    };

    // Update order
    const updatedOrder = await Order.update(orderId, orderData);

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
});

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: Order deleted successfully
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/orders/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const deletedOrder = await Order.delete(orderId);
    
    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: deletedOrder,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete order'
    });
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', authenticateToken, validateId, validateOrderStatus, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    // Check if order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status
    const updatedOrder = await Order.updateStatus(orderId, status);

    // Send status update notification (if needed for customer)
    try {
      await NotificationService.sendOrderStatusUpdate(updatedOrder, status);
    } catch (notificationError) {
      console.error('Failed to send status update notification:', notificationError);
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

/**
 * @swagger
 * /api/admin/menu:
 *   get:
 *     summary: Get all menu items (including inactive)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/menu', authenticateToken, async (req, res) => {
  try {
    const menuItems = await Menu.findAll(false); // Include inactive items
    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error('Error fetching admin menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu'
    });
  }
});

/**
 * @swagger
 * /api/admin/menu:
 *   post:
 *     summary: Create new menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Flat White"
 *               category:
 *                 type: string
 *                 example: "Coffee"
 *               base_price:
 *                 type: number
 *                 format: decimal
 *                 example: 4.50
 *               customizations:
 *                 type: object
 *                 example:
 *                   sizes: ["Small", "Medium", "Large"]
 *                   milk: ["Regular", "Oat", "Almond"]
 *               active:
 *                 type: boolean
 *                 example: true
 *             required: [name, category, base_price]
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *                 message:
 *                   type: string
 *                   example: Menu item created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/menu', authenticateToken, validateMenu, async (req, res) => {
  try {
    const menuData = {
      name: req.body.name,
      category: req.body.category,
      base_price: req.body.base_price,
      customizations: req.body.customizations || {},
      active: req.body.active !== undefined ? req.body.active : true
    };

    const menuItem = await Menu.create(menuData);

    res.status(201).json({
      success: true,
      data: menuItem,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu item'
    });
  }
});

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   put:
 *     summary: Update menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Coffee Name"
 *               category:
 *                 type: string
 *                 example: "Coffee"
 *               base_price:
 *                 type: number
 *                 format: decimal
 *                 example: 5.00
 *               customizations:
 *                 type: object
 *                 example:
 *                   sizes: ["Small", "Medium", "Large", "Extra Large"]
 *                   milk: ["Regular", "Oat", "Almond", "Soy"]
 *               active:
 *                 type: boolean
 *                 example: true
 *             required: [name, category, base_price]
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *                 message:
 *                   type: string
 *                   example: Menu item updated successfully
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/menu/:id', authenticateToken, validateId, validateMenu, async (req, res) => {
  try {
    const menuId = req.params.id;
    
    // Check if menu item exists
    const existingMenuItem = await Menu.findById(menuId);
    if (!existingMenuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const menuData = {
      name: req.body.name,
      category: req.body.category,
      base_price: req.body.base_price,
      customizations: req.body.customizations || {},
      active: req.body.active !== undefined ? req.body.active : true
    };

    const updatedMenuItem = await Menu.update(menuId, menuData);

    res.json({
      success: true,
      data: updatedMenuItem,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu item'
    });
  }
});

/**
 * @swagger
 * /api/admin/menu/{id}:
 *   delete:
 *     summary: Delete menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MenuItem'
 *                 message:
 *                   type: string
 *                   example: Menu item deleted successfully
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error (may occur if item has existing orders)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/menu/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const menuId = req.params.id;
    
    const deletedMenuItem = await Menu.delete(menuId);
    
    if (!deletedMenuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: deletedMenuItem,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu item'
    });
  }
});

/**
 * @swagger
 * /api/admin/sales/today:
 *   get:
 *     summary: Get daily sales summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Daily sales data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SalesData'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sales/today', authenticateToken, async (req, res) => {
  try {
    const salesData = await Order.getTodaySales();
    
    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        total_orders: parseInt(salesData.total_orders),
        total_revenue: parseFloat(salesData.total_revenue),
        completed_orders: parseInt(salesData.completed_orders),
        pending_orders: parseInt(salesData.pending_orders),
        completion_rate: salesData.total_orders > 0 
          ? ((salesData.completed_orders / salesData.total_orders) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales data'
    });
  }
});

/**
 * @swagger
 * /api/admin/test-notification:
 *   post:
 *     summary: Send test push notification
 *     description: Sends a test push notification to FCM tokens associated with the authenticated user. If no user tokens are found, uses the first available token in the system for testing.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestNotificationRequest'
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Test notification sent'
 *       400:
 *         description: No FCM tokens found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Test notification endpoint (for debugging)
router.post('/test-notification', authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    
    // Get user's FCM tokens by Firebase UID
    let userTokens = await FcmToken.findByFirebaseUid(req.user.uid);
    
    // Fallback to any available token if user has none
    if (userTokens.length === 0) {
      const allTokens = await FcmToken.getAll();
      if (allTokens.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No FCM tokens found'
        });
      }
      // Use first available token for testing
      await NotificationService.testNotification(allTokens[0], title, body);
    } else {
      // Use user's first token
      await NotificationService.testNotification(userTokens[0].token, title, body);
    }
    
    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

module.exports = router;