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

// Error message keys (for localization)
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'unauthorized',
  INVALID_CREDENTIALS: 'invalid_credentials',
  TOKEN_EXPIRED: 'token_expired',
  VALIDATION_FAILED: 'validation_failed',
  ORDER_NOT_FOUND: 'order_not_found',
  MENU_ITEM_NOT_FOUND: 'menu_item_not_found',
  SERVER_ERROR: 'server_error'
};

// Success message keys (for localization)
const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  MENU_ITEM_CREATED: 'menu_item_created',
  MENU_ITEM_UPDATED: 'menu_item_updated',
  MENU_ITEM_DELETED: 'menu_item_deleted'
};

module.exports = {
  ORDER_STATUS,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  // Locale and formatting
  DEFAULT_LOCALE: 'en',
  DATE_REGEX_YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/,
  // Time constants
  DAY_MS: 24 * 60 * 60 * 1000,
  DEFAULT_ANALYTICS_LOOKBACK_DAYS: 30,
  // Limits
  TOP_ITEMS_LIMITS: {
    DEFAULT: 10,
    MIN: 1,
    MAX: 100,
  },
  LINE_MESSAGES: {
    ORDER_HEADER_PREFIX: 'Order #',
    AT_LABEL_PREFIX: 'At  ', // note: double space intentional
    DIVIDER: '---',
    ITEM_HEADER: 'Item',
    FOLLOW_THANK_YOU: 'Thanks for following! You will now receive order notifications.',
    REGISTER_SUCCESS: 'Registered successfully. You will receive notifications here.',
    HELP_TEXT: 'Commands: register | help',
    OK_ACK: 'OK',
    BACKOFFICE_ORDER_URL_PREFIX: 'https://timing-backoffice.vercel.app/orders/'
  }
};
