const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const Menu = require('../models/Menu');
const Order = require('../models/Order');
const NotificationService = require('../services/notificationService');
const { validateOrder, validateId } = require('../middleware/validation');

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
router.get('/menu', async (req, res) => {
  try {
    const cachedMenu = cache.get(CACHE_KEY);
    if (cachedMenu) {
      return res.json({
        success: true,
        data: cachedMenu,
        fromCache: true
      });
    }

    const menu = await Menu.getMenuByCategory();
    cache.put(CACHE_KEY, menu, CACHE_TIME_MS);

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu'
    });
  }
});

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
router.get('/menu/:id', validateId, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Only return active menu items to customers
    if (!menuItem.active) {
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
router.post('/orders', validateOrder, async (req, res) => {
  try {
    const orderData = {
      customer_id: req.body.customer_id,
      customer_info: req.body.customer_info,
      items: req.body.items,
      total: req.body.total
    };

    // Validate that menu items exist and calculate total
    const itemIds = orderData.items.map(item => item.menu_id);
    const menuItems = await Menu.findByIds(itemIds);
    const menuItemsById = menuItems.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    let calculatedTotal = 0;
    for (const item of orderData.items) {
      const menuItem = menuItemsById[item.menu_id];
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

    // Send notification to admins
    try {
      await NotificationService.sendOrderNotification(order);
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the order creation if notification fails
    }

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
router.get('/orders/:id/status', validateId, async (req, res) => {
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
      data: {
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        total: order.total,
        customer_info: order.customer_info,
        items: order.items
      }
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order status'
    });
  }
});

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
router.get('/orders/customer/:customer_id', async (req, res) => {
  try {
    const orders = await Order.findAll({ customer_id: req.params.customer_id });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer orders'
    });
  }
});

module.exports = router;