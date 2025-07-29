const express = require('express');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const Order = require('../models/Order');
const Beverage = require('../models/Beverage');
const NotificationService = require('../services/notificationService');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { 
  validateLogin, 
  validateOrderStatus, 
  validateBeverage, 
  validateId 
} = require('../middleware/validation');

// POST /api/admin/login - Admin authentication
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password, fcm_token } = req.body;

    // Find admin user
    const user = await AdminUser.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Validate password
    const isValidPassword = await AdminUser.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update FCM token if provided
    if (fcm_token) {
      await AdminUser.updateFcmToken(user.id, fcm_token);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username
        }
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// GET /api/admin/orders - All orders with filters
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

// GET /api/admin/menu - Get all menu items (including inactive)
router.get('/menu', authenticateToken, async (req, res) => {
  try {
    const beverages = await Beverage.findAll(false); // Include inactive items
    res.json({
      success: true,
      data: beverages
    });
  } catch (error) {
    console.error('Error fetching admin menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu'
    });
  }
});

// POST /api/admin/menu - Create new menu item
router.post('/menu', authenticateToken, validateBeverage, async (req, res) => {
  try {
    const beverageData = {
      name: req.body.name,
      category: req.body.category,
      base_price: req.body.base_price,
      customizations: req.body.customizations || {},
      active: req.body.active !== undefined ? req.body.active : true
    };

    const beverage = await Beverage.create(beverageData);

    res.status(201).json({
      success: true,
      data: beverage,
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

// PUT /api/admin/menu/:id - Update menu item
router.put('/menu/:id', authenticateToken, validateId, validateBeverage, async (req, res) => {
  try {
    const beverageId = req.params.id;
    
    // Check if beverage exists
    const existingBeverage = await Beverage.findById(beverageId);
    if (!existingBeverage) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const beverageData = {
      name: req.body.name,
      category: req.body.category,
      base_price: req.body.base_price,
      customizations: req.body.customizations || {},
      active: req.body.active !== undefined ? req.body.active : true
    };

    const updatedBeverage = await Beverage.update(beverageId, beverageData);

    res.json({
      success: true,
      data: updatedBeverage,
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

// DELETE /api/admin/menu/:id - Delete menu item
router.delete('/menu/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const beverageId = req.params.id;
    
    const deletedBeverage = await Beverage.delete(beverageId);
    
    if (!deletedBeverage) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: deletedBeverage,
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

// GET /api/admin/sales/today - Daily sales summary
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

// Test notification endpoint (for debugging)
router.post('/test-notification', authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    const user = await AdminUser.findById(req.user.id);
    
    if (!user.fcm_token) {
      return res.status(400).json({
        success: false,
        error: 'No FCM token found for user'
      });
    }

    await NotificationService.testNotification(user.fcm_token, title, body);
    
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