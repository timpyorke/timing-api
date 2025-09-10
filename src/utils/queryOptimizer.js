/**
 * Query optimization utilities for better database performance
 *
 * Provides helpers for both raw SQL (string-based) and Sequelize ORM options.
 */

const { Op } = require('sequelize');

/**
 * Build dynamic WHERE clause with proper parameterization
 * @param {Object} filters - Filter object
 * @param {number} startParamIndex - Starting parameter index (default: 1)
 * @returns {Object} { whereClause, values, nextParamIndex }
 */
const buildWhereClause = (filters, startParamIndex = 1) => {
  const conditions = [];
  const values = [];
  let paramIndex = startParamIndex;

  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') {
      // Handle different filter types
      switch (key) {
        case 'date':
          conditions.push(`DATE(o.created_at) = $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'status':
        case 'category':
        case 'customer_id':
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'active':
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        default:
          // Generic equality check
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
      }
    }
  });

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return {
    whereClause,
    values,
    nextParamIndex: paramIndex
  };
};

/**
 * Build ORDER BY clause with validation
 * @param {string} sortBy - Column to sort by
 * @param {string} sortOrder - Sort order (ASC/DESC)
 * @param {Array} allowedColumns - Allowed columns for sorting
 * @returns {string} ORDER BY clause
 */
const buildOrderByClause = (sortBy, sortOrder = 'DESC', allowedColumns = []) => {
  // Validate sort parameters
  const validOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
  if (sortBy && allowedColumns.includes(sortBy)) {
    return `ORDER BY ${sortBy} ${validOrder}`;
  }
  
  return 'ORDER BY created_at DESC'; // Default ordering
};

/**
 * Build LIMIT and OFFSET clause for pagination
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of items per page
 * @param {number} maxPageSize - Maximum allowed page size
 * @returns {Object} { limitClause, offset, limit }
 */
const buildPaginationClause = (page = 1, pageSize = 20, maxPageSize = 100) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.min(maxPageSize, Math.max(1, parseInt(pageSize) || 20));
  const offset = (validPage - 1) * validPageSize;
  
  return {
    limitClause: `LIMIT ${validPageSize} OFFSET ${offset}`,
    offset,
    limit: validPageSize
  };
};

module.exports = {
  buildWhereClause,
  buildOrderByClause,
  buildPaginationClause,
  // Sequelize/ORM helpers
  buildSequelizeWhere,
  buildSequelizeOrder,
  buildSequelizePagination,
};

/**
 * Build a Sequelize `where` object from filters.
 * Supports: date (YYYY-MM-DD), status, category, customer_id, active.
 * @param {Object} filters
 * @param {Object} fieldMap Optional mapping from logical keys to model field names
 * @returns {Object} where
 */
function buildSequelizeWhere(filters = {}, fieldMap = {}) {
  const where = {};
  const dateField = fieldMap.date || 'created_at';

  for (const [key, value] of Object.entries(filters || {})) {
    if (value == null || value === '') continue;
    switch (key) {
      case 'date': {
        // Interpret as UTC day range
        const start = new Date(`${value}T00:00:00.000Z`);
        const end = new Date(`${value}T23:59:59.999Z`);
        where[dateField] = { [Op.between]: [start, end] };
        break;
      }
      case 'status': {
        const field = fieldMap.status || 'status';
        where[field] = value;
        break;
      }
      case 'category': {
        const field = fieldMap.category || 'category';
        where[field] = value;
        break;
      }
      case 'customer_id': {
        const field = fieldMap.customer_id || 'customer_id';
        where[field] = value;
        break;
      }
      case 'active': {
        const field = fieldMap.active || 'active';
        where[field] = Boolean(value);
        break;
      }
      default: {
        const field = fieldMap[key] || key;
        where[field] = value;
        break;
      }
    }
  }
  return where;
}

/**
 * Build a Sequelize `order` option from inputs.
 * @param {string} sortBy
 * @param {string} sortOrder
 * @param {Array<string>} allowedColumns
 * @param {string} defaultColumn
 * @returns {Array} order option, e.g. [["created_at", "DESC"]]
 */
function buildSequelizeOrder(sortBy, sortOrder = 'DESC', allowedColumns = [], defaultColumn = 'created_at') {
  const validOrder = typeof sortOrder === 'string' && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const column = allowedColumns && allowedColumns.includes(sortBy) ? sortBy : defaultColumn;
  return [[column, validOrder]];
}

/**
 * Build Sequelize pagination options.
 * @param {number} page 1-based
 * @param {number} pageSize
 * @param {number} maxPageSize
 * @returns {Object} { limit, offset }
 */
function buildSequelizePagination(page = 1, pageSize = 20, maxPageSize = 100) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.min(maxPageSize, Math.max(1, parseInt(pageSize) || 20));
  const offset = (validPage - 1) * validPageSize;
  return { limit: validPageSize, offset };
}
