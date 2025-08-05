const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const Menu = require('../models/Menu');
const Order = require('../models/Order');
const NotificationService = require('../services/notificationService');
const websocketService = require('../services/websocketService');
const { validateOrder, validateId } = require('../middleware/validation');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responseHelpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

const CACHE_KEY = 'full-menu';
const CACHE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: Customer-facing API endpoints
 */

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get public menu with categories
 *     tags: [Customer]
 *     responses:
 *       200:
 *         description: Menu retrieved successfully
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
 *                     $ref: '#/components/schemas/MenuCategory'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/menu', asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const cacheKey = `${CACHE_KEY}-${locale}`;
  
  const cachedMenu = cache.get(cacheKey);
  if (cachedMenu) {
    return sendSuccess(res, cachedMenu);
  }

  const menu = await Menu.getMenuByCategory(locale);
  cache.put(cacheKey, menu, CACHE_TIME_MS);

  sendSuccess(res, menu);
}));

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get a specific menu item by ID
 *     tags: [Customer]
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/menu/:id', validateId, asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const menuItem = await Menu.findById(req.params.id, locale);
  
  if (!menuItem || !menuItem.active) {
    return sendError(res, ERROR_MESSAGES.MENU_ITEM_NOT_FOUND, 404);
  }

  sendSuccess(res, menuItem);
}));

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Customer]
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
 *         description: Validation error or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/orders', validateOrder, asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const orderData = {
    customer_id: req.body.customer_id,
    customer_info: req.body.customer_info,
    items: req.body.items,
    total: req.body.total,
    customer_locale: locale,
    notes: req.body.notes,
    notes_th: req.body.notes_th
  };

  // Validate that menu items exist and calculate total
  const itemIds = orderData.items.map(item => item.menu_id);
  const menuItems = await Menu.findByIds(itemIds, locale);
  const menuItemsById = menuItems.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  let calculatedTotal = 0;
  for (const item of orderData.items) {
    const menuItem = menuItemsById[item.menu_id];
    if (!menuItem) {
      return sendError(res, `Menu item with ID ${item.menu_id} not found`, 400);
    }
    if (!menuItem.active) {
      return sendError(res, `Menu item "${menuItem.name}" is currently unavailable`, 400);
    }
    calculatedTotal += parseFloat(item.price) * item.quantity;
  }

  // Verify the total matches (allow small floating point differences)
  if (Math.abs(calculatedTotal - parseFloat(orderData.total)) > 0.01) {
    return sendError(res, 'Order total does not match item prices', 400);
  }

  // Create the order
  const order = await Order.create(orderData);

  // Validate that order was created successfully
  if (!order || !order.id) {
    console.error('Order creation failed - no order returned or missing id');
    return sendError(res, 'Failed to create order', 500);
  }

  // Send notification to admins
  try {
    const locale = req.locale || 'en';
    await NotificationService.sendOrderNotification(order, locale);
    console.log(`Notification sent successfully for order ${order.id}`);
  } catch (notificationError) {
    console.error('Failed to send notification for order', order.id, ':', notificationError.message);
    // Don't fail the order creation if notification fails
    // Log the error but continue with successful order response
  }

  sendSuccess(res, order, SUCCESS_MESSAGES.ORDER_CREATED, 201);
}));

/**
 * @swagger
 * /api/orders/{id}/status:
 *   get:
 *     summary: Check order status
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/:id/status', validateId, asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const order = await Order.findById(req.params.id, locale);
  
  if (!order) {
    return sendError(res, ERROR_MESSAGES.ORDER_NOT_FOUND, 404);
  }

  // The order now includes localized fields from the model
  const orderStatus = {
    id: order.id,
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    total: order.total,
    customer_info: order.customer_info,
    notes: order.notes,
    items: order.items
  };

  sendSuccess(res, orderStatus);
}));

/**
 * @swagger
 * /api/orders/customer/{customer_id}:
 *   get:
 *     summary: Get all orders for a specific customer
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer orders retrieved successfully
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/customer/:customer_id', asyncHandler(async (req, res) => {
  const locale = req.locale || 'en';
  const orders = await Order.findAll({ customer_id: req.params.customer_id }, 'created_at', 'DESC', locale);
  sendSuccess(res, orders);
}));

module.exports = router;