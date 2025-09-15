const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Menu = require('../models/Menu');
const Order = require('../models/Order');
const lineService = require('../services/lineService');
const { validateOrder, validateId } = require('../middleware/validation');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responseHelpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, DEFAULT_LOCALE, LOG_MESSAGES } = require('../utils/constants');

// Upload config for optional order attachment
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'orders');
function ensureDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) { /* noop */ }
}
ensureDirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ext = path.extname(safeBase) || '';
    const base = safeBase.replace(ext, '');
    const stamp = Date.now();
    cb(null, `${stamp}_${base}${ext}`);
  }
});

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf'
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  }
});

// Convert JSON-like string fields to objects for multipart requests
function coerceMultipartFields(req, res, next) {
  const maybeParse = (val) => {
    if (val == null) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (_) { return Symbol.for('parse_error'); }
    }
    return val;
  };

  const isMultipart = typeof req.headers['content-type'] === 'string' && req.headers['content-type'].includes('multipart/form-data');
  if (!isMultipart) return next();

  const parsedCustomer = maybeParse(req.body.customer_info);
  if (parsedCustomer === Symbol.for('parse_error')) {
    return sendError(res, 'Invalid JSON in customer_info', 400);
  }
  const parsedItems = maybeParse(req.body.items);
  if (parsedItems === Symbol.for('parse_error')) {
    return sendError(res, 'Invalid JSON in items', 400);
  }
  if (parsedCustomer !== undefined) req.body.customer_info = parsedCustomer;
  if (parsedItems !== undefined) req.body.items = parsedItems;

  // Optional numeric coercion
  if (typeof req.body.total === 'string') {
    const n = Number(req.body.total);
    if (!Number.isFinite(n)) return sendError(res, 'Invalid total', 400);
    req.body.total = n;
  }
  if (typeof req.body.discount_amount === 'string' && req.body.discount_amount !== '') {
    const n = Number(req.body.discount_amount);
    if (!Number.isFinite(n) || n < 0) return sendError(res, 'Invalid discount_amount', 400);
    req.body.discount_amount = n;
  }
  next();
}

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
  const locale = req.locale || DEFAULT_LOCALE;
  const cacheKey = `${CACHE_KEY}-${locale}`;
  
  const cachedMenu = cache.get(cacheKey);
  if (cachedMenu) {
    return res.json({ success: true, data: cachedMenu });
  }

  const menu = await Menu.getMenuByCategory(locale);
  cache.put(cacheKey, menu, CACHE_TIME_MS);

  res.json({ success: true, data: menu });
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
  const locale = req.locale || DEFAULT_LOCALE;
  const menuItem = await Menu.findById(req.params.id, locale);
  
  if (!menuItem || !menuItem.active) {
    return sendError(res, ERROR_MESSAGES.MENU_ITEM_NOT_FOUND, 404);
  }

  res.json({ success: true, data: menuItem });
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               customer_info:
 *                 type: string
 *                 description: JSON string for CustomerInfo
 *               items:
 *                 type: string
 *                 description: JSON string array of OrderItem
 *               discount_amount:
 *                 type: number
 *                 description: Optional discount amount
 *               total:
 *                 type: number
 *               notes:
 *                 type: string
 *               attachment:
 *                 type: string
 *                 format: binary
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
router.post('/orders', upload.single('attachment'), coerceMultipartFields, validateOrder, asyncHandler(async (req, res) => {
  const locale = req.locale || DEFAULT_LOCALE;
  const orderData = {
    customer_id: req.body.customer_id,
    customer_info: req.body.customer_info,
    items: req.body.items,
    total: req.body.total,
    discount_amount: req.body.discount_amount || 0,
    customer_locale: locale,
    notes: req.body.notes
  };

  // If a file was uploaded, set the public URL
  if (req.file && req.file.filename) {
    orderData.attachment_url = `/uploads/orders/${req.file.filename}`;
  }

  // Validate that menu items exist and calculate total
  const itemIds = orderData.items.map(item => item.menu_id);
  const menuItems = await Menu.findByIds(itemIds, locale);
  const menuItemsById = menuItems.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  let calculatedSubtotal = 0;
  for (const item of orderData.items) {
    const menuItem = menuItemsById[item.menu_id];
    if (!menuItem) {
      return sendError(res, `Menu item with ID ${item.menu_id} not found`, 400);
    }
    if (!menuItem.active) {
      return sendError(res, `Menu item "${menuItem.name}" is currently unavailable`, 400);
    }
    calculatedSubtotal += parseFloat(item.price) * item.quantity;
  }

  // Validate discount_amount
  const discount = parseFloat(orderData.discount_amount) || 0;
  if (discount < 0) {
    return sendError(res, 'discount_amount cannot be negative', 400);
  }
  if (discount > calculatedSubtotal + 0.0001) {
    return sendError(res, 'discount_amount cannot exceed subtotal', 400);
  }

  // Verify the total matches subtotal - discount (allow small floating point differences)
  const expectedTotal = calculatedSubtotal - discount;
  if (Math.abs(expectedTotal - parseFloat(orderData.total)) > 0.01) {
    return sendError(res, 'Order total does not match item prices minus discount', 400);
  }

  // Create the order
  const order = await Order.create(orderData);

  // Validate that order was created successfully
  if (!order || !order.id) {
    console.error(LOG_MESSAGES.ORDER_CREATION_FAILED_NO_ID);
    return sendError(res, 'Failed to create order', 500);
  }

  // Send LINE notification (fire-and-forget)
  try {
    lineService.sendOrderCreatedNotification(order)
      .catch(err => console.warn(LOG_MESSAGES.CUSTOMER_LINE_NOTIFY_FAILED_PREFIX, err?.message || err));
  } catch (e) {
    console.warn(LOG_MESSAGES.CUSTOMER_LINE_NOTIFY_SETUP_ERROR_PREFIX, e?.message || e);
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
  const locale = req.locale || DEFAULT_LOCALE;
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
  const locale = req.locale || DEFAULT_LOCALE;
  const orders = await Order.findAll({ customer_id: req.params.customer_id }, 'created_at', 'DESC', locale);
  sendSuccess(res, orders);
}));

module.exports = router;
