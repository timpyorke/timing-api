const pool = require('../config/database');

class Menu {
  static async findAll(activeOnly = true) {
    const query = activeOnly 
      ? 'SELECT * FROM menus WHERE active = true ORDER BY category, name'
      : 'SELECT * FROM menus ORDER BY category, name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM menus WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(menuData) {
    const query = `
      INSERT INTO menus (name, category, base_price, image_url, customizations, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      menuData.name,
      menuData.category,
      menuData.base_price,
      menuData.image_url || null,
      menuData.customizations || {},
      menuData.active !== undefined ? menuData.active : true
    ]);
    return result.rows[0];
  }

  static async update(id, menuData) {
    const query = `
      UPDATE menus 
      SET name = $1, category = $2, base_price = $3, image_url = $4, customizations = $5, active = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await pool.query(query, [
      menuData.name,
      menuData.category,
      menuData.base_price,
      menuData.image_url || null,
      menuData.customizations || {},
      menuData.active,
      id
    ]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM menus WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getMenuByCategory() {
    const query = `
      SELECT 
        category,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'base_price', base_price,
            'image_url', image_url,
            'customizations', customizations
          )
        ) as items
      FROM menus 
      WHERE active = true
      GROUP BY category
      ORDER BY category
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Menu;