const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class AdminUser {
  static async findByUsername(username) {
    const query = 'SELECT * FROM admin_users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM admin_users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateFcmToken(id, fcmToken) {
    const query = `
      UPDATE admin_users 
      SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [fcmToken, id]);
    return result.rows[0];
  }

  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const query = `
      INSERT INTO admin_users (username, password_hash, fcm_token)
      VALUES ($1, $2, $3)
      RETURNING id, username, fcm_token, created_at, updated_at
    `;
    const result = await pool.query(query, [
      userData.username,
      hashedPassword,
      userData.fcm_token || null
    ]);
    return result.rows[0];
  }
}

module.exports = AdminUser;