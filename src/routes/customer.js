const express = require('express');
const router = express.Router();
const Beverage = require('../models/Beverage');
const Order = require('../models/Order');
const NotificationService = require('../services/notificationService');
const { validateOrder, validateId } = require('../middleware/validation');

// GET /api/menu - Public menu with categories
router.get('/menu', async (req, res) => {
  try {
    const menu = await Beverage.getMenuByCategory();
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

// POST /api/orders - Create new order + trigger Firebase notification
router.post('/orders', validateOrder, async (req, res) => {
  try {
    const orderData = {
      customer_info: req.body.customer_info,
      items: req.body.items,
      total: req.body.total
    };

    // Validate that beverages exist and calculate total
    let calculatedTotal = 0;
    for (const item of orderData.items) {
      const beverage = await Beverage.findById(item.beverage_id);
      if (!beverage) {
        return res.status(400).json({
          success: false,
          error: `Beverage with ID ${item.beverage_id} not found`
        });
      }
      if (!beverage.active) {
        return res.status(400).json({
          success: false,
          error: `Beverage "${beverage.name}" is currently unavailable`
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

// GET /api/orders/:id/status - Check order status
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

module.exports = router;