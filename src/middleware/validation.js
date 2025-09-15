const { body, param, query, validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/responseHelpers');
const { ORDER_STATUS } = require('../utils/constants');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }
  next();
};

// Order validation
const validateOrder = [
  body('customer_info').isObject().withMessage('Customer info must be an object'),
  body('customer_info.name').notEmpty().withMessage('Customer name is required'),
  body('customer_info.phone').optional().matches(/^[+]?[\d\s\-\(\)]{7,20}$/).withMessage('Invalid phone number format'),
  body('customer_id').optional().isString().withMessage('Customer ID must be a string'),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.menu_id').isInt({ min: 1 }).withMessage('Valid menu ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.customizations').optional().isObject().withMessage('Customizations must be an object'),
  body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a non-negative number'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('attachment_url').optional().custom((value) => {
    if (value == null || value === '') return true;
    return /^https?:\/\/.+/.test(value);
  }).withMessage('attachment_url must be a valid URL or empty'),
  handleValidationErrors
];

// Menu validation
const validateMenu = [
  body('name_en').notEmpty().withMessage('English menu item name is required'),
  body('name_th').notEmpty().withMessage('Thai menu item name is required'),
  body('description_en').optional().isString().withMessage('English description must be a string'),
  body('description_th').optional().isString().withMessage('Thai description must be a string'),
  body('category_en').notEmpty().withMessage('English category is required'),
  body('category_th').notEmpty().withMessage('Thai category is required'),
  body('base_price').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('image_url').optional().custom((value) => {
    if (value == null || value === '') {
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
  body('status').isIn(Object.values(ORDER_STATUS))
    .withMessage(`Status must be one of: ${Object.values(ORDER_STATUS).join(', ')}`),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required'),
  handleValidationErrors
];

// OneSignal player ID validation
const validateOneSignalPlayerId = [
  body('player_id').notEmpty().withMessage('OneSignal player ID is required')
    .isString().withMessage('OneSignal player ID must be a string')
    .isLength({ min: 10 }).withMessage('OneSignal player ID is too short'),
  handleValidationErrors
];

// FCM token validation (kept for backward compatibility)
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
  body('player_id').optional().isString().withMessage('OneSignal player ID must be a string'),
  handleValidationErrors
];

module.exports = {
  validateOrder,
  validateMenu,
  validateLogin,
  validateOrderStatus,
  validateId,
  validateFcmToken,
  validateOneSignalPlayerId,
  handleValidationErrors
};
