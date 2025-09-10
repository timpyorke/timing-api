const { ERROR_MESSAGES } = require('./constants');
const localization = require('./localization');

// Optional: rewrite image_url fields to use local proxy
const SHOULD_REWRITE_IMAGES = (process.env.IMAGE_PROXY_REWRITE === 'true' || process.env.IMAGE_PROXY_REWRITE === '1');
// If set, produce absolute URLs for the proxy so that frontends on other domains
// don’t 404 when they try to request /img on their own origin.
// Example: https://api.yourdomain.com
const PROXY_BASE = ((process.env.PUBLIC_BASE_URL || process.env.IMAGE_PROXY_ORIGIN || '') + '')
  .trim()
  .replace(/\/$/, '');

function buildBaseFromRequest(req) {
  if (!req) return '';
  // Prefer forwarded headers if behind a proxy (requires trust proxy for req.protocol)
  const xfProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const proto = xfProto || req.protocol || 'http';
  const xfHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0].trim();
  const host = xfHost || req.headers.host || '';
  if (!host) return '';
  return `${proto}://${host}`.replace(/\/$/, '');
}

function buildProxiedUrl(url, baseOverride) {
  if (typeof url !== 'string' || url.length === 0) return url;
  // Avoid double-proxying
  const effectiveBase = (baseOverride || PROXY_BASE || '').trim();
  if (url.startsWith('/img?url=')) {
    return effectiveBase ? `${effectiveBase}${url}` : url;
  }
  // Only proxy absolute http/https URLs; leave relative or data/blob URLs as-is
  if (!/^https?:\/\//i.test(url)) return url;
  const encoded = encodeURIComponent(url);
  const proxiedPath = `/img?url=${encoded}`;
  return effectiveBase ? `${effectiveBase}${proxiedPath}` : proxiedPath;
}

function rewriteImageUrlsDeep(value, seen = new WeakSet(), baseOverride = '') {
  if (Array.isArray(value)) {
    return value.map(v => rewriteImageUrlsDeep(v, seen, baseOverride));
  }
  if (value && typeof value === 'object') {
    // Prevent cycles
    if (seen.has(value)) return value;
    seen.add(value);
    const out = Array.isArray(value) ? [] : {};
    for (const key of Object.keys(value)) {
      if (key === 'image_url') {
        out[key] = buildProxiedUrl(value[key], baseOverride);
      } else {
        out[key] = rewriteImageUrlsDeep(value[key], seen, baseOverride);
      }
    }
    return out;
  }
  return value;
}

/**
 * Standard success response structure
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} messageKey - Success message key for localization
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} messageParams - Parameters for message interpolation
 */
const sendSuccess = (res, data, messageKey = null, statusCode = 200, messageParams = {}) => {
  const req = res.req;
  const locale = req ? localization.getLocaleFromRequest(req) : 'en';
  let baseOverride = '';
  if (SHOULD_REWRITE_IMAGES) {
    // Prefer configured base, otherwise derive from request
    baseOverride = PROXY_BASE || buildBaseFromRequest(req) || '';
  }
  const payload = SHOULD_REWRITE_IMAGES ? rewriteImageUrlsDeep(data, new WeakSet(), baseOverride) : data;
  const response = {
    success: true,
    data: payload
  };
  
  if (messageKey) {
    response.message = localization.getSuccessMessage(messageKey, locale, messageParams);
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Standard error response structure
 * @param {Object} res - Express response object
 * @param {string} errorKey - Error message key for localization
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Additional error details (for validation errors)
 * @param {Object} messageParams - Parameters for message interpolation
 */
const sendError = (res, errorKey = ERROR_MESSAGES.SERVER_ERROR, statusCode = 500, details = null, messageParams = {}) => {
  const req = res.req;
  const locale = req ? localization.getLocaleFromRequest(req) : 'en';
  const response = {
    success: false,
    error: localization.getErrorMessage(errorKey, locale, messageParams)
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
  const { LOG_MESSAGES } = require('./constants');
  console.error(`${operation} ${LOG_MESSAGES.RESPONSE_OPERATION_FAILED_SUFFIX}`, error);
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
