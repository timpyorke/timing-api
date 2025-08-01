// Order status constants
const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Notification types
const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  STATUS_UPDATE: 'status_update',
  TEST: 'test'
};

// Error messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token expired',
  VALIDATION_FAILED: 'Validation failed',
  ORDER_NOT_FOUND: 'Order not found',
  BEVERAGE_NOT_FOUND: 'Beverage not found',
  MENU_ITEM_NOT_FOUND: 'Menu item not found',
  SERVER_ERROR: 'Internal server error'
};

// Success messages
const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Order created successfully',
  ORDER_UPDATED: 'Order updated successfully',
  MENU_ITEM_CREATED: 'Menu item created successfully',
  MENU_ITEM_UPDATED: 'Menu item updated successfully',
  MENU_ITEM_DELETED: 'Menu item deleted successfully'
};

module.exports = {
  ORDER_STATUS,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};