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
  ,
  LOG_MESSAGES: {
    SERVER_RUNNING_PREFIX: 'Server running on port',
    DB_INIT_ERROR_PREFIX: 'Database initialization error:',
    LINE_TOKEN_MISSING_WARN: 'LINE_CHANNEL_ACCESS_TOKEN is not set. LINE notifications are disabled.',
    ORM_LINE_TOKEN_NOT_INITIALIZED: 'ORM model LineToken not initialized',
    FETCH_LINE_IDS_FAILED_PREFIX: 'Failed to fetch LINE user IDs (ORM):',
    LINE_NO_RECIPIENTS_WARN: 'No LINE user IDs found; skipping LINE notification',
    LINE_CLIENT_NOT_INIT_WARN: 'LINE client is not initialized; skipping LINE notification',
    LINE_NOTIFY_SUMMARY_PREFIX: 'LINE notifications:',
    LINE_ORDER_NOTIFY_FAILED_PREFIX: 'Failed to send LINE order created notification:',
    ADMIN_LINE_NOTIFY_FAILED_PREFIX: 'LINE notify (admin create) failed:',
    ADMIN_LINE_NOTIFY_SETUP_ERROR_PREFIX: 'LINE notify (admin create) setup error:',
    CUSTOMER_LINE_NOTIFY_FAILED_PREFIX: 'LINE notify (customer create) failed:',
    CUSTOMER_LINE_NOTIFY_SETUP_ERROR_PREFIX: 'LINE notify (customer create) setup error:',
    ERROR_CREATING_ORDER_PREFIX: 'Error creating order:',
    ERROR_FETCHING_ORDER_PREFIX: 'Error fetching order:',
    ERROR_UPDATING_ORDER_PREFIX: 'Error updating order:',
    ERROR_DELETING_ORDER_PREFIX: 'Error deleting order:',
    ERROR_UPDATING_ORDER_STATUS_PREFIX: 'Error updating order status:',
    ERROR_FETCHING_ADMIN_MENU_PREFIX: 'Error fetching admin menu:',
    ERROR_FETCHING_MENU_ITEM_PREFIX: 'Error fetching menu item:',
    ERROR_CREATING_MENU_ITEM_PREFIX: 'Error creating menu item:',
    ERROR_UPDATING_MENU_ITEM_PREFIX: 'Error updating menu item:',
    ERROR_DELETING_MENU_ITEM_PREFIX: 'Error deleting menu item:',
    ERROR_FETCHING_DAILY_SALES_PREFIX: 'Error fetching daily sales:',
    ERROR_FETCHING_SALES_INSIGHTS_PREFIX: 'Error fetching sales insights:',
    ERROR_FETCHING_TOP_ITEMS_PREFIX: 'Error fetching top selling items:',
    LOCALIZATION_LOAD_FAILED_PREFIX: 'Failed to load translations for locale',
    RESPONSE_OPERATION_FAILED_SUFFIX: 'failed:',
    LINE_WEBHOOK_TOKEN_MISSING_WARN: 'LINE webhook: LINE_CHANNEL_ACCESS_TOKEN is not set. Replies disabled.',
    LINE_WEBHOOK_UPSERT_FAILED_PREFIX: 'LINE webhook: failed to upsert line_user_id',
    LINE_WEBHOOK_REMOVE_FAILED_PREFIX: 'LINE webhook: failed to remove line_user_id',
    LINE_WEBHOOK_HANDLER_ERROR_PREFIX: 'LINE webhook: handler error',
    LINE_WEBHOOK_CONFIG_MISSING_WARN: 'LINE webhook: missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET. Webhook will accept but do nothing.',
    UTILS_DB_QUERY_ERROR_PREFIX: 'Database query error:',
    UTILS_TRANSACTION_ERROR_PREFIX: 'Transaction error:',
    FIREBASE_NOT_CONFIGURED_WARN: '⚠️  Firebase credentials not configured. Push notifications will be disabled.',
    FIREBASE_INIT_SUCCESS: '✅ Firebase Admin SDK initialized successfully',
    FIREBASE_INIT_FAILED_PREFIX: '❌ Failed to initialize Firebase:',
    FIREBASE_DISABLED_WARN: '⚠️  Firebase will be disabled. Push notifications will not work.',
    AUTH_JWT_FAILED_FIREBASE_DISABLED: '🔐 JWT failed and Firebase is disabled',
    AUTH_JWT_FAILED_TRY_FIREBASE: '🔐 JWT failed, trying Firebase token verification',
    AUTH_FIREBASE_ATTEMPT_PREFIX: '🔐 Firebase token verification attempt:',
    AUTH_FIREBASE_VERIFIED_PREFIX: '✅ Firebase token verified successfully:',
    AUTH_TOKEN_VERIFICATION_ERROR_PREFIX: '❌ Token verification error:',
    MODELS_INIT_TABLE_ENSURED: 'DB init: ensured table line_tokens',
    MODELS_INIT_TABLE_FAILED_PREFIX: 'DB init: failed to ensure line_tokens table',
    DB_CONNECTED: 'Connected to PostgreSQL database',
    DB_CONNECTION_ERROR_PREFIX: 'Database connection error:',
    DB_POOL_SHUTTING_DOWN: 'Shutting down database pool...',
    DB_POOL_CLOSED: 'Database pool closed',
    DB_MONITOR_SLOW_QUERY_PREFIX: 'Slow query detected',
    DB_MONITOR_QUERY_FAILED_PREFIX: 'Query failed',
    ORDER_CREATION_FAILED_NO_ID: 'Order creation failed - no order returned or missing id',
    // Migrations
    MIGRATIONS_TABLE_READY: '✅ Migrations table ready',
    MIGRATIONS_CREATE_TABLE_FAILED_PREFIX: '❌ Failed to create migrations table:',
    MIGRATIONS_GET_EXECUTED_FAILED_PREFIX: '❌ Failed to get executed migrations:',
    MIGRATIONS_RECORDED_PREFIX: '📝 Recorded migration:',
    MIGRATIONS_RECORD_FAILED_PREFIX: '❌ Failed to record migration',
    MIGRATIONS_STARTING: '🚀 Starting database migrations...',
    MIGRATIONS_NO_DIR: '📁 No migrations directory found',
    MIGRATIONS_FOUND_FILES_PREFIX: '📂 Found',
    MIGRATIONS_ALREADY_EXECUTED_PREFIX: '✅',
    MIGRATIONS_SKIPPING_PREFIX: '⏭️  Skipping',
    MIGRATIONS_RUNNING_PREFIX: '🔄 Running migration:',
    MIGRATIONS_COMPLETED_PREFIX: '✅ Completed migration:',
    MIGRATIONS_FAILED_PREFIX: '❌ Migration',
    MIGRATIONS_ALL_DONE: '🎉 All migrations completed successfully!',
    MIGRATIONS_PROCESS_COMPLETED: '✨ Migration process completed',
    MIGRATIONS_PROCESS_FAILED_PREFIX: '💥 Migration process failed:',
  }
};
