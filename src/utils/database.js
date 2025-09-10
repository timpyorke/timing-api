const pool = require('../config/database');

/**
 * Execute a database query with error handling
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const executeQuery = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    const { LOG_MESSAGES } = require('./constants');
    console.error(LOG_MESSAGES.UTILS_DB_QUERY_ERROR_PREFIX, {
      error: error.message,
      query: query.substring(0, 100) + '...',
      params: params
    });
    throw error;
  }
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Function containing transaction logic
 * @returns {Promise<*>} Transaction result
 */
const executeTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const { LOG_MESSAGES } = require('./constants');
    console.error(LOG_MESSAGES.UTILS_TRANSACTION_ERROR_PREFIX, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if a record exists by ID
 * @param {string} tableName - Name of the table
 * @param {number} id - Record ID
 * @returns {Promise<boolean>} True if record exists
 */
const recordExists = async (tableName, id) => {
  const query = `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE id = $1)`;
  const result = await executeQuery(query, [id]);
  return result.rows[0].exists;
};

/**
 * Get a single record by ID
 * @param {string} tableName - Name of the table
 * @param {number} id - Record ID
 * @param {string} columns - Columns to select (default: *)
 * @returns {Promise<Object|null>} Record or null if not found
 */
const findById = async (tableName, id, columns = '*') => {
  const query = `SELECT ${columns} FROM ${tableName} WHERE id = $1`;
  const result = await executeQuery(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  executeQuery,
  executeTransaction,
  recordExists,
  findById
};
