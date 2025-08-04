const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const FcmToken = require('../models/FcmToken');
const NotificationService = require('../services/notificationService');
const websocketService = require('../services/websocketService');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { 
  validateOrderStatus, 
  validateMenu, 
  validateLogin,
  validateId,
  validateFcmToken 
} = require('../middleware/validation');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHelpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only API endpoints (requires authentication)
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate admin user and return JWT token
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *               fcm_token:
 *                 type: string
 *                 description: Optional FCM token for push notifications
 *             required: [username, password]
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 message:
 *                   type: string
 *                   example: Login successful
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { username, password, fcm_token } = req.body;
  
  // Simple hardcoded admin authentication (replace with database lookup in production)
  if (username !== 'admin' || password !== 'admin123') {
    return sendError(res, ERROR_MESSAGES.INVALID_CREDENTIALS, 401);
  }

  // Generate JWT token
  const payload = { 
    username: 'admin', 
    role: 'admin',
    uid: 'admin-uid-12345'
  };
  const token = generateToken(payload);
  
  // Store FCM token if provided
  if (fcm_token) {
    try {
      await FcmToken.store(fcm_token, payload.uid, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  }
  
  sendSuccess(res, { token }, 'Login successful');
}));

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
router.post('/fcm-token', authenticateToken, validateFcmToken, asyncHandler(async (req, res) => {
  const { fcm_token } = req.body;
  
  // Store FCM token with optional device info
  const deviceInfo = {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  const storedToken = await FcmToken.store(fcm_token, req.user.uid, deviceInfo);
  
  const responseData = {
    token_id: storedToken.id,
    user: {
      uid: req.user.uid,
      email: req.user.email,
      email_verified: req.user.email_verified
    }
  };
  
  sendSuccess(res, responseData, 'FCM token stored successfully');
}));

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
router.get('/debug-token', authenticateToken, asyncHandler(async (req, res) => {
  const debugData = {
    user: req.user,
    timestamp: new Date().toISOString()
  };
  
  sendSuccess(res, debugData, 'Token is valid');
}));

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
router.get('/orders', authenticateToken, asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const filters = {};
  
  if (req.query.status) {
    filters.status = req.query.status;
  }
  
  if (req.query.date) {
    filters.date = req.query.date;
  }

  const orders = await Order.findAll(filters, 'created_at', 'DESC', locale);
  const responseData = {
    orders,
    count: orders.length
  };

  sendSuccess(res, responseData);
}));

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
      const menuItem = await Menu.findById(item.menu_id);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          error: `Menu item with ID ${item.menu_id} not found`
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

    // Send status update notifications (both Firebase and real-time)
    try {
      await NotificationService.sendOrderStatusUpdate(updatedOrder, status);
      websocketService.sendOrderStatusUpdate(updatedOrder, status);
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
    const locale = req.locale || 'en';
    const menuItems = await Menu.findAll(false, locale); // Include inactive items
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
 * /api/admin/menu/{id}:
 *   get:
 *     summary: Get specific menu item by ID
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
 *         description: Menu item retrieved successfully
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
 */
router.get('/menu/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item'
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
 *             $ref: '#/components/schemas/CreateMenuItemRequest'
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
      name_th: req.body.name_th || null,
      description: req.body.description || null,
      description_th: req.body.description_th || null,
      category: req.body.category,
      category_th: req.body.category_th || null,
      base_price: req.body.base_price,
      image_url: req.body.image_url || null,
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
 *             $ref: '#/components/schemas/CreateMenuItemRequest'
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
      name_th: req.body.name_th || null,
      description: req.body.description || null,
      description_th: req.body.description_th || null,
      category: req.body.category,
      category_th: req.body.category_th || null,
      base_price: req.body.base_price,
      image_url: req.body.image_url || null,
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
 * /api/admin/sales/insights:
 *   get:
 *     summary: Get comprehensive sales insights
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (YYYY-MM-DD). Defaults to 30 days ago
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (YYYY-MM-DD). Only used with start_date
 *     responses:
 *       200:
 *         description: Sales insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_orders:
 *                           type: integer
 *                           example: 150
 *                         total_revenue:
 *                           type: number
 *                           example: 1250.50
 *                         average_order_value:
 *                           type: number
 *                           example: 8.34
 *                         completed_orders:
 *                           type: integer
 *                           example: 140
 *                         pending_orders:
 *                           type: integer
 *                           example: 5
 *                         preparing_orders:
 *                           type: integer
 *                           example: 3
 *                         ready_orders:
 *                           type: integer
 *                           example: 2
 *                         cancelled_orders:
 *                           type: integer
 *                           example: 0
 *                         completed_revenue:
 *                           type: number
 *                           example: 1167.50
 *                         completion_rate:
 *                           type: string
 *                           example: "93.3"
 *                     daily_breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           order_date:
 *                             type: string
 *                             format: date-time
 *                           total_orders:
 *                             type: integer
 *                           total_revenue:
 *                             type: number
 *                 period:
 *                   type: object
 *                   properties:
 *                     start_date:
 *                       type: string
 *                       format: date
 *                     end_date:
 *                       type: string
 *                       format: date
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sales/insights', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Validate date format if provided
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD'
      });
    }
    
    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD'
      });
    }

    const salesData = await Order.getSalesInsights(start_date, end_date);
    
    // Calculate completion rate
    const completionRate = salesData.summary.total_orders > 0 
      ? ((parseInt(salesData.summary.completed_orders) / parseInt(salesData.summary.total_orders)) * 100).toFixed(1)
      : 0;
    
    // Determine actual period used
    const actualStartDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const actualEndDate = end_date || new Date().toISOString().split('T')[0];

    res.json({
      success: true,
      data: {
        summary: {
          ...salesData.summary,
          total_orders: parseInt(salesData.summary.total_orders),
          total_revenue: parseFloat(salesData.summary.total_revenue),
          average_order_value: parseFloat(salesData.summary.average_order_value),
          completed_orders: parseInt(salesData.summary.completed_orders),
          pending_orders: parseInt(salesData.summary.pending_orders),
          preparing_orders: parseInt(salesData.summary.preparing_orders),
          ready_orders: parseInt(salesData.summary.ready_orders),
          cancelled_orders: parseInt(salesData.summary.cancelled_orders),
          completed_revenue: parseFloat(salesData.summary.completed_revenue),
          completion_rate: completionRate
        },
        daily_breakdown: salesData.daily_breakdown.map(day => ({
          ...day,
          total_orders: parseInt(day.total_orders),
          total_revenue: parseFloat(day.total_revenue),
          average_order_value: parseFloat(day.average_order_value)
        }))
      },
      period: {
        start_date: actualStartDate,
        end_date: actualEndDate
      }
    });
  } catch (error) {
    console.error('Error fetching sales insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales insights'
    });
  }
});

/**
 * @swagger
 * /api/admin/sales/top-items:
 *   get:
 *     summary: Get top selling menu items
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (YYYY-MM-DD). Defaults to 30 days ago
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (YYYY-MM-DD). Only used with start_date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of top items to return
 *     responses:
 *       200:
 *         description: Top selling items retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       menu_id:
 *                         type: integer
 *                         example: 1
 *                       menu_name:
 *                         type: string
 *                         example: "Cappuccino"
 *                       category:
 *                         type: string
 *                         example: "Coffee"
 *                       base_price:
 *                         type: number
 *                         example: 4.50
 *                       image_url:
 *                         type: string
 *                         example: "https://example.com/cappuccino.jpg"
 *                       total_quantity_sold:
 *                         type: integer
 *                         example: 85
 *                       number_of_orders:
 *                         type: integer
 *                         example: 42
 *                       total_revenue:
 *                         type: number
 *                         example: 382.50
 *                       average_price:
 *                         type: number
 *                         example: 4.50
 *                       percentage_of_total_sales:
 *                         type: number
 *                         example: 15.25
 *                 period:
 *                   type: object
 *                   properties:
 *                     start_date:
 *                       type: string
 *                       format: date
 *                     end_date:
 *                       type: string
 *                       format: date
 *                 count:
 *                   type: integer
 *                   example: 10
 *       400:
 *         description: Invalid parameters
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
router.get('/sales/top-items', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;
    
    // Validate date format if provided
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD'
      });
    }
    
    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD'
      });
    }
    
    // Validate limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be a number between 1 and 100'
      });
    }

    const topItems = await Order.getTopSellingItems(start_date, end_date, limitNum);
    
    // Determine actual period used
    const actualStartDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const actualEndDate = end_date || new Date().toISOString().split('T')[0];

    res.json({
      success: true,
      data: topItems.map(item => ({
        ...item,
        menu_id: parseInt(item.menu_id),
        base_price: parseFloat(item.base_price),
        total_quantity_sold: parseInt(item.total_quantity_sold),
        number_of_orders: parseInt(item.number_of_orders),
        total_revenue: parseFloat(item.total_revenue),
        average_price: parseFloat(item.average_price),
        percentage_of_total_sales: parseFloat(item.percentage_of_total_sales)
      })),
      period: {
        start_date: actualStartDate,
        end_date: actualEndDate
      },
      count: topItems.length
    });
  } catch (error) {
    console.error('Error fetching top selling items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top selling items'
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
    
    // Get user's FCM tokens by Firebase UID or admin tokens
    let userTokens = [];
    
    // Check if user is admin (JWT token) or Firebase user
    if (req.user.role === 'admin') {
      // For admin users, get all available tokens since admin can test all devices
      userTokens = await FcmToken.getAll();
    } else {
      // For Firebase users, get their specific tokens
      userTokens = await FcmToken.findByFirebaseUid(req.user.uid);
    }
    
    // Fallback if no tokens found
    if (userTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No FCM tokens found'
      });
    }
    
    // Use first available token for testing
    const tokenToUse = Array.isArray(userTokens) ? userTokens[0] : userTokens[0].token;
    await NotificationService.testNotification(tokenToUse, title, body);
    
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

/**
 * @swagger
 * /api/admin/websocket/stats:
 *   get:
 *     summary: Get WebSocket connection statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     adminConnections:
 *                       type: number
 *                       example: 2
 *                     isInitialized:
 *                       type: boolean
 *                       example: true
 */
router.get('/websocket/stats', authenticateToken, (req, res) => {
  try {
    const stats = websocketService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket stats'
    });
  }
});

module.exports = router;