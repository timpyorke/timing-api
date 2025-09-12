const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Inventory = require('../models/Inventory');
const lineService = require('../services/lineService');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { 
  validateOrderStatus, 
  validateMenu, 
  validateLogin,
  validateId,
  validateOneSignalPlayerId 
} = require('../middleware/validation');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHelpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, DEFAULT_LOCALE, DATE_REGEX_YYYY_MM_DD, TOP_ITEMS_LIMITS, DAY_MS, DEFAULT_ANALYTICS_LOOKBACK_DAYS, LOG_MESSAGES } = require('../utils/constants');

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
 *               player_id:
 *                 type: string
 *                 description: Optional OneSignal player ID for push notifications
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
  const { username, password } = req.body;
  
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
  
  sendSuccess(res, { token }, 'Login successful');
}));

/**
 * @swagger
 * /api/admin/onesignal-token:
 *   post:
 *     summary: Store OneSignal player ID for push notifications
 *     description: Stores a OneSignal player ID associated with the authenticated user for receiving push notifications. The player ID is stored separately from user accounts and can be updated multiple times.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OneSignalTokenRequest'
 *     responses:
 *       200:
 *         description: OneSignal player ID stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OneSignalTokenResponse'
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
// Removed OneSignal token storage endpoint per request

/**
 * @swagger
 * /api/admin/line-token:
 *   post:
 *     summary: Store LINE user ID for push notifications  
 *     description: Stores a LINE user ID associated with the authenticated user for receiving LINE notifications. The user ID is stored separately from user accounts and can be updated multiple times.
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
 *               line_user_id:
 *                 type: string
 *                 description: LINE user ID for notifications
 *                 example: U1234567890abcdef1234567890abcdef
 *               user_info:
 *                 type: object
 *                 description: Optional user information from LINE
 *             required: [line_user_id]
 *     responses:
 *       200:
 *         description: LINE user ID stored successfully
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
 *                     line_user_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid LINE user ID format
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Removed LINE token storage endpoint per request

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
  const locale = req.locale || DEFAULT_LOCALE;
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
      total: req.body.total,
      discount_amount: req.body.discount_amount || 0
    };

    // Validate that menu items exist and calculate subtotal
    let calculatedSubtotal = 0;
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
      calculatedSubtotal += parseFloat(item.price) * item.quantity;
    }

    // Validate discount_amount
    const discount = parseFloat(orderData.discount_amount) || 0;
    if (discount < 0) {
      return res.status(400).json({ success: false, error: 'discount_amount cannot be negative' });
    }
    if (discount > calculatedSubtotal + 0.0001) {
      return res.status(400).json({ success: false, error: 'discount_amount cannot exceed subtotal' });
    }

    // Verify the total matches subtotal - discount (allow small floating point differences)
    const expectedTotal = calculatedSubtotal - discount;
    if (Math.abs(expectedTotal - parseFloat(orderData.total)) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Order total does not match item prices minus discount'
      });
    }

    // Create the order
    const order = await Order.create(orderData);

    // Fire-and-forget LINE notification (do not block response)
    try {
      lineService.sendOrderCreatedNotification(order)
        .catch(err => console.warn(LOG_MESSAGES.ADMIN_LINE_NOTIFY_FAILED_PREFIX, err?.message || err));
    } catch (e) {
      console.warn(LOG_MESSAGES.ADMIN_LINE_NOTIFY_SETUP_ERROR_PREFIX, e?.message || e);
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('insufficient stock') || msg.includes('ingredient not found')) {
      console.error(LOG_MESSAGES.ERROR_CREATING_ORDER_PREFIX, error?.message || error);
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error(LOG_MESSAGES.ERROR_CREATING_ORDER_PREFIX, error);
    return res.status(500).json({ success: false, error: 'Failed to create order' });
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
    console.error(LOG_MESSAGES.ERROR_FETCHING_ORDER_PREFIX, error);
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
      total: req.body.total,
      discount_amount: req.body.discount_amount || 0
    };

    // Update order
    const updatedOrder = await Order.update(orderId, orderData);

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('insufficient stock') || msg.includes('ingredient not found')) {
      console.error(LOG_MESSAGES.ERROR_UPDATING_ORDER_PREFIX, error?.message || error);
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error(LOG_MESSAGES.ERROR_UPDATING_ORDER_PREFIX, error);
    return res.status(500).json({ success: false, error: 'Failed to update order' });
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
    console.error(LOG_MESSAGES.ERROR_DELETING_ORDER_PREFIX, error);
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

    // Update order status (returns null if order not found)
    const updatedOrder = await Order.updateStatus(orderId, status);
    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_UPDATING_ORDER_STATUS_PREFIX, error?.message || error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

/**
 * @swagger
 * /api/admin/ingredients:
 *   get:
 *     summary: List ingredients and current stock
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Ingredients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ingredients:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ingredient'
 *                     count:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
    const locale = req.locale || DEFAULT_LOCALE;
    const menuItems = await Menu.findAll(false, locale); // Include inactive items
    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_FETCHING_ADMIN_MENU_PREFIX, error);
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
    console.error(LOG_MESSAGES.ERROR_FETCHING_MENU_ITEM_PREFIX, error);
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
      name_en: req.body.name_en || null,
      description: req.body.description || null,
      description_th: req.body.description_th || null,
      description_en: req.body.description_en || null,
      category: req.body.category,
      category_th: req.body.category_th || null,
      category_en: req.body.category_en || null,
      base_price: req.body.base_price,
      image_url: req.body.image_url || null,
      customizations: req.body.customizations || {},
      customizations_en: req.body.customizations_en || {},
      active: req.body.active ?? true
    };

    const menuItem = await Menu.create(menuData);

    res.status(201).json({
      success: true,
      data: menuItem,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_CREATING_MENU_ITEM_PREFIX, error);
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
      name_en: req.body.name_en || null,
      description: req.body.description || null,
      description_th: req.body.description_th || null,
      description_en: req.body.description_en || null,
      category: req.body.category,
      category_th: req.body.category_th || null,
      category_en: req.body.category_en || null,
      base_price: req.body.base_price,
      image_url: req.body.image_url || null,
      customizations: req.body.customizations || {},
      customizations_en: req.body.customizations_en || {},
      active: req.body.active ?? true
    };

    const updatedMenuItem = await Menu.update(menuId, menuData);

    res.json({
      success: true,
      data: updatedMenuItem,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_UPDATING_MENU_ITEM_PREFIX, error);
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
    console.error(LOG_MESSAGES.ERROR_DELETING_MENU_ITEM_PREFIX, error);
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
    console.error(LOG_MESSAGES.ERROR_FETCHING_DAILY_SALES_PREFIX, error);
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
 *         description: Start date for analysis (YYYY-MM-DD). If omitted (and end_date omitted), returns all-time.
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). With start_date, defines a range; alone means from beginning until end_date.
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
 *                     all_time:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sales/insights', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, locale = DEFAULT_LOCALE } = req.query;
    
    // Validate date format if provided
    if (start_date && !DATE_REGEX_YYYY_MM_DD.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD'
      });
    }
    
    if (end_date && !DATE_REGEX_YYYY_MM_DD.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD'
      });
    }

    const salesData = await Order.getSalesInsights(start_date, end_date, locale);
    
    // Calculate completion rate
    const completionRate = salesData.summary.total_orders > 0 
      ? ((parseInt(salesData.summary.completed_orders) / parseInt(salesData.summary.total_orders)) * 100).toFixed(1)
      : 0;
    
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
        start_date: start_date || null,
        end_date: end_date || null,
        all_time: (!start_date && !end_date) ? true : false
      }
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_FETCHING_SALES_INSIGHTS_PREFIX, error);
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
 *                     all_time:
 *                       type: boolean
 *                       example: true
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
    const { start_date, end_date, limit = TOP_ITEMS_LIMITS.DEFAULT, locale = DEFAULT_LOCALE } = req.query;
    
    // Validate date format if provided
    if (start_date && !DATE_REGEX_YYYY_MM_DD.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format. Use YYYY-MM-DD'
      });
    }
    
    if (end_date && !DATE_REGEX_YYYY_MM_DD.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format. Use YYYY-MM-DD'
      });
    }
    
    // Validate limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < TOP_ITEMS_LIMITS.MIN || limitNum > TOP_ITEMS_LIMITS.MAX) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be a number between 1 and 100'
      });
    }

    const topItems = await Order.getTopSellingItems(start_date, end_date, limitNum, locale);

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
        start_date: start_date || null,
        end_date: end_date || null,
        all_time: (!start_date && !end_date) ? true : false
      },
      count: topItems.length
    });
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_FETCHING_TOP_ITEMS_PREFIX, error);
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
 *     description: Sends a test push notification to OneSignal player IDs associated with the authenticated user. If no user player IDs are found, uses the first available player ID in the system for testing.
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
 *         description: No OneSignal player IDs found
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
// Removed OneSignal test notification endpoint per request

/**
 * @swagger
 * /api/admin/test-line-notification:
 *   post:
 *     summary: Send test LINE notification
 *     description: Sends a test LINE notification to LINE user IDs associated with the authenticated user. If no user LINE IDs are found, uses the first available LINE user ID in the system for testing.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Test notification title
 *                 example: "Test Notification"
 *               body:
 *                 type: string
 *                 description: Test notification body
 *                 example: "This is a test LINE notification"
 *     responses:
 *       200:
 *         description: Test LINE notification sent successfully
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
 *                   example: 'Test LINE notification sent'
 *       400:
 *         description: No LINE user IDs found
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
// Test LINE notification endpoint (for debugging)
// Removed test LINE notification endpoint per request

// WebSocket stats endpoint removed

/**
 * Inventory management endpoints
 */

// GET /api/admin/ingredients - list ingredients and stock
router.get('/ingredients', authenticateToken, asyncHandler(async (req, res) => {
  const items = await Inventory.listIngredients();
  sendSuccess(res, { ingredients: items, count: items.length });
}));

/**
 * @swagger
 * /api/admin/ingredients:
 *   post:
 *     summary: Upsert ingredient and optionally set stock
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpsertIngredientRequest'
 *     responses:
 *       200:
 *         description: Ingredient saved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 */
router.post('/ingredients', authenticateToken, asyncHandler(async (req, res) => {
  const { name, unit, stock } = req.body || {};
  if (!name || !unit) return sendError(res, 'name and unit are required', 400);
  const ing = await Inventory.upsertIngredient({ name, unit });
  let result = ing;
  if (typeof stock !== 'undefined') {
    result = await Inventory.setStockByName(name, Number(stock));
  }
  sendSuccess(res, result, 'Ingredient saved');
}));

/**
 * @swagger
 * /api/admin/ingredients/add-stock:
 *   post:
 *     summary: Add quantity to current stock
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddStockRequest'
 *     responses:
 *       200:
 *         description: Stock added and ingredient returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 */
router.post('/ingredients/add-stock', authenticateToken, asyncHandler(async (req, res) => {
  const { name, quantity } = req.body || {};
  if (!name || !Number.isFinite(Number(quantity))) return sendError(res, 'name and numeric quantity required', 400);
  const updated = await Inventory.addStockByName(name, Number(quantity));
  sendSuccess(res, updated, 'Stock added');
}));

/**
 * @swagger
 * /api/admin/ingredients/{id}:
 *   delete:
 *     summary: Delete ingredient by ID
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
 *         description: Ingredient ID
 *     responses:
 *       200:
 *         description: Ingredient deleted successfully
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
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     unit:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Ingredient deleted
 *       404:
 *         description: Ingredient not found
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
router.delete('/ingredients/:id', authenticateToken, validateId, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await Inventory.deleteIngredientById(id);
  if (!deleted) return sendError(res, 'Ingredient not found', 404);
  sendSuccess(res, deleted, 'Ingredient deleted');
}));

/**
 * @swagger
 * /api/admin/menu/{id}/recipe:
 *   post:
 *     summary: Set menu recipe (ingredients and per-unit quantities)
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
 *             $ref: '#/components/schemas/SetRecipeRequest'
 *     responses:
 *       200:
 *         description: Recipe saved and returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     menu_id:
 *                       type: integer
 *                     recipe:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           menu_id: { type: integer }
 *                           ingredient_id: { type: integer }
 *                           name: { type: string }
 *                           unit: { type: string }
 *                           quantity_per_unit: { type: number }
 */
router.post('/menu/:id/recipe', authenticateToken, validateId, asyncHandler(async (req, res) => {
  const menuId = Number(req.params.id);
  const items = (req.body && req.body.items) || [];
  if (!Array.isArray(items) || items.length === 0) return sendError(res, 'recipe items required', 400);
  await Inventory.setRecipe(menuId, items);
  const recipe = await Inventory.getRecipe(menuId);
  sendSuccess(res, { menu_id: menuId, recipe }, 'Recipe saved');
}));

/**
 * @swagger
 * /api/admin/menu/{id}/recipe:
 *   get:
 *     summary: Get menu recipe (ingredients and per-unit quantities)
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
 *         description: Recipe retrieved successfully
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
 *                     menu_id:
 *                       type: integer
 *                       example: 1
 *                     recipe:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           menu_id: { type: integer, example: 1 }
 *                           ingredient_id: { type: integer, example: 3 }
 *                           name: { type: string, example: "Milk" }
 *                           unit: { type: string, example: "ml" }
 *                           quantity_per_unit: { type: number, example: 30 }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/menu/:id/recipe', authenticateToken, validateId, asyncHandler(async (req, res) => {
  const menuId = Number(req.params.id);
  const recipe = await Inventory.getRecipe(menuId);
  sendSuccess(res, { menu_id: menuId, recipe });
}));

module.exports = router;
