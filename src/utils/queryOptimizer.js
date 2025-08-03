/**
 * Query optimization utilities for better database performance
 */

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
    if (value !== undefined && value !== null && value !== '') {
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
  buildPaginationClause
};