const pool = require('../config/database');

class DatabaseMonitor {
  static async getPoolStats() {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }

  static async checkHealth() {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      return {
        status: 'healthy',
        timestamp: result.rows[0].now,
        pool: await this.getPoolStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        pool: await this.getPoolStats()
      };
    }
  }

  static logSlowQueries(originalQuery) {
    return async function wrappedQuery(text, params) {
      const start = Date.now();
      try {
        const result = await originalQuery.call(this, text, params);
        const duration = Date.now() - start;
        
        // Log queries taking longer than 1 second
        if (duration > 1000) {
          console.warn(`Slow query detected (${duration}ms):`, {
            query: text.substring(0, 100) + '...',
            duration,
            timestamp: new Date().toISOString()
          });
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`Query failed (${duration}ms):`, {
          query: text.substring(0, 100) + '...',
          error: error.message,
          duration
        });
        throw error;
      }
    };
  }
}

// Wrap pool.query with monitoring
if (process.env.NODE_ENV !== 'test') {
  pool.query = DatabaseMonitor.logSlowQueries(pool.query.bind(pool));
}

module.exports = DatabaseMonitor;