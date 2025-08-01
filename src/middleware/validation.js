const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Order validation
const validateOrder = [
  body('customer_info').isObject().withMessage('Customer info must be an object'),
  body('customer_info.name').notEmpty().withMessage('Customer name is required'),
  body('customer_info.phone').optional().matches(/^[+]?[\d\s\-\(\)]{7,20}$/).withMessage('Invalid phone number format'),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.menu_id').isInt({ min: 1 }).withMessage('Valid menu ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.customizations').optional().isObject().withMessage('Customizations must be an object'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  handleValidationErrors
];

// Menu validation
const validateMenu = [
  body('name').notEmpty().withMessage('Menu item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('base_price').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('image_url').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) {
      return true;
    }
    return /^https?:\/\/.+/.test(value);
  }).withMessage('Image URL must be a valid URL or empty'),
  body('customizations').optional().isObject().withMessage('Customizations must be an object'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean'),
  handleValidationErrors
];

// Order status validation
const validateOrderStatus = [
  body('status').isIn(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, preparing, ready, completed, cancelled'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required'),
  handleValidationErrors
];

// FCM token validation
const validateFcmToken = [
  body('fcm_token').notEmpty().withMessage('FCM token is required')
    .isString().withMessage('FCM token must be a string')
    .isLength({ min: 10 }).withMessage('FCM token is too short'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fcm_token').optional().isString().withMessage('FCM token must be a string'),
  handleValidationErrors
];

module.exports = {
  validateOrder,
  validateMenu,
  validateLogin,
  validateOrderStatus,
  validateId,
  validateFcmToken,
  handleValidationErrors
};