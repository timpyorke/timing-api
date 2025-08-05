const localization = require('../utils/localization');

/**
 * Middleware to add locale support to requests and responses
 */
const localeMiddleware = (req, res, next) => {
  // Store request reference in response for access in helper functions
  res.req = req;
  
  // Get locale from request
  const locale = localization.getLocaleFromRequest(req);
  req.locale = locale;
  
  // Add locale to response headers for client reference
  res.set('Content-Language', locale);
  
  next();
};

module.exports = localeMiddleware;