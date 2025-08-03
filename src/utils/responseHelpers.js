const { ERROR_MESSAGES } = require('./constants');

/**
 * Standard success response structure
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Standard error response structure
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Additional error details (for validation errors)
 */
const sendError = (res, error = ERROR_MESSAGES.SERVER_ERROR, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Handle validation errors from express-validator
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation error array
 */
const sendValidationError = (res, errors) => {
  return sendError(res, ERROR_MESSAGES.VALIDATION_FAILED, 400, errors);
};

/**
 * Handle database operation errors
 * @param {Object} res - Express response object
 * @param {Error} error - Database error
 * @param {string} operation - Operation that failed
 */
const handleDatabaseError = (res, error, operation = 'Database operation') => {
  console.error(`${operation} failed:`, error);
  return sendError(res, ERROR_MESSAGES.SERVER_ERROR, 500);
};

/**
 * Handle async route functions and catch errors
 * @param {Function} fn - Async route handler function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  handleDatabaseError,
  asyncHandler
};