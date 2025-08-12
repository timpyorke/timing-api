const { executeQuery } = require('../utils/database');

class LineToken {
  static async store(lineUserId, userId = null, userInfo = {}) {
    const query = `
      INSERT INTO line_tokens (line_user_id, user_id, user_info)
      VALUES ($1, $2, $3)
      ON CONFLICT (line_user_id) 
      DO UPDATE SET 
        user_id = $2,
        user_info = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await executeQuery(query, [lineUserId, userId, userInfo]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT line_user_id FROM line_tokens ORDER BY updated_at DESC';
    const result = await executeQuery(query);
    return result.rows.map(row => row.line_user_id);
  }

  static async remove(lineUserId) {
    const query = 'DELETE FROM line_tokens WHERE line_user_id = $1 RETURNING *';
    const result = await executeQuery(query, [lineUserId]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM line_tokens WHERE user_id = $1';
    const result = await executeQuery(query, [userId]);
    return result.rows;
  }

  static async findByLineUserId(lineUserId) {
    const query = 'SELECT * FROM line_tokens WHERE line_user_id = $1';
    const result = await executeQuery(query, [lineUserId]);
    return result.rows[0];
  }

  static async cleanup(olderThanDays = 30) {
    const query = `
      DELETE FROM line_tokens 
      WHERE updated_at < NOW() - INTERVAL '1 day' * $1
      RETURNING *
    `;
    const result = await executeQuery(query, [olderThanDays]);
    return result.rows;
  }
}

module.exports = LineToken;