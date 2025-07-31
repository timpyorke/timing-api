const pool = require('../config/database');

class FcmToken {
  static async store(token, firebaseUid = null, deviceInfo = {}) {
    const query = `
      INSERT INTO fcm_tokens (token, firebase_uid, device_info)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) 
      DO UPDATE SET 
        firebase_uid = $2,
        device_info = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [token, firebaseUid, deviceInfo]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT token FROM fcm_tokens ORDER BY updated_at DESC';
    const result = await pool.query(query);
    return result.rows.map(row => row.token);
  }

  static async remove(token) {
    const query = 'DELETE FROM fcm_tokens WHERE token = $1 RETURNING *';
    const result = await pool.query(query, [token]);
    return result.rows[0];
  }

  static async findByFirebaseUid(firebaseUid) {
    const query = 'SELECT * FROM fcm_tokens WHERE firebase_uid = $1';
    const result = await pool.query(query, [firebaseUid]);
    return result.rows;
  }

  static async cleanup(olderThanDays = 30) {
    const query = `
      DELETE FROM fcm_tokens 
      WHERE updated_at < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = FcmToken;