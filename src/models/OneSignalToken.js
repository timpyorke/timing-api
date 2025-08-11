const { executeQuery } = require('../utils/database');

class OneSignalToken {
  static async store(playerId, userId = null, deviceInfo = {}) {
    const query = `
      INSERT INTO onesignal_tokens (player_id, user_id, device_info)
      VALUES ($1, $2, $3)
      ON CONFLICT (player_id) 
      DO UPDATE SET 
        user_id = $2,
        device_info = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await executeQuery(query, [playerId, userId, deviceInfo]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT player_id FROM onesignal_tokens ORDER BY updated_at DESC';
    const result = await executeQuery(query);
    return result.rows.map(row => row.player_id);
  }

  static async remove(playerId) {
    const query = 'DELETE FROM onesignal_tokens WHERE player_id = $1 RETURNING *';
    const result = await executeQuery(query, [playerId]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM onesignal_tokens WHERE user_id = $1';
    const result = await executeQuery(query, [userId]);
    return result.rows;
  }

  static async cleanup(olderThanDays = 30) {
    const query = `
      DELETE FROM onesignal_tokens 
      WHERE updated_at < NOW() - INTERVAL '1 day' * $1
      RETURNING *
    `;
    const result = await executeQuery(query, [olderThanDays]);
    return result.rows;
  }
}

module.exports = OneSignalToken;