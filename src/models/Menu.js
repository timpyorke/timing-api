const { executeQuery } = require('../utils/database');

class Menu {
  static async findAll(activeOnly = true, locale = 'en') {
    const query = activeOnly 
      ? 'SELECT * FROM menus WHERE active = true ORDER BY category, name'
      : 'SELECT * FROM menus ORDER BY category, name';
    const result = await executeQuery(query);
    
    // Add localized fields to each menu item
    return result.rows.map(menu => this.addLocalizedFields(menu, locale));
  }

  static async findById(id, locale = 'en') {
    const query = 'SELECT * FROM menus WHERE id = $1';
    const result = await executeQuery(query, [id]);
    
    if (result.rows[0]) {
      return this.addLocalizedFields(result.rows[0], locale);
    }
    return result.rows[0];
  }

  static async findByIds(ids, locale = 'en') {
    const query = 'SELECT * FROM menus WHERE id = ANY($1::int[])';
    const result = await executeQuery(query, [ids]);
    
    // Add localized fields to each menu item
    return result.rows.map(menu => this.addLocalizedFields(menu, locale));
  }

  static async create(menuData) {
    const query = `
      INSERT INTO menus (name, name_th, category, category_th, base_price, image_url, description, description_th, customizations, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await executeQuery(query, [
      menuData.name,
      menuData.name_th || null,
      menuData.category,
      menuData.category_th || null,
      menuData.base_price,
      menuData.image_url || null,
      menuData.description || null,
      menuData.description_th || null,
      menuData.customizations || {},
      menuData.active !== undefined ? menuData.active : true
    ]);
    return result.rows[0];
  }

  static async update(id, menuData) {
    const query = `
      UPDATE menus 
      SET name = $1, name_th = $2, category = $3, category_th = $4, base_price = $5, image_url = $6, 
          description = $7, description_th = $8, customizations = $9, active = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;
    const result = await executeQuery(query, [
      menuData.name,
      menuData.name_th || null,
      menuData.category,
      menuData.category_th || null,
      menuData.base_price,
      menuData.image_url || null,
      menuData.description || null,
      menuData.description_th || null,
      menuData.customizations || {},
      menuData.active,
      id
    ]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM menus WHERE id = $1 RETURNING *';
    const result = await executeQuery(query, [id]);
    return result.rows[0];
  }

  static async getMenuByCategory(locale = 'en') {
    const query = `
      SELECT 
        category,
        category_th,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'name_th', name_th,
            'description', description,
            'description_th', description_th,
            'base_price', base_price,
            'image_url', image_url,
            'customizations', customizations
          )
        ) as items
      FROM menus 
      WHERE active = true
      GROUP BY category, category_th
      ORDER BY category
    `;
    const result = await executeQuery(query);
    
    // Add localized fields for categories and items
    return result.rows.map(category => {
      const localizedCategory = this.getLocalizedCategory(category, locale);
      const localizedItems = category.items.map(item => this.addLocalizedFields(item, locale));
      
      return {
        category: category.category,
        category_localized: localizedCategory,
        items: localizedItems
      };
    });
  }

  static addLocalizedFields(menu, locale = 'en') {
    const localized = { ...menu };
    
    // Add localized name
    if (locale === 'th' && menu.name_th) {
      localized.name_localized = menu.name_th;
    } else {
      localized.name_localized = menu.name;
    }
    
    // Add localized description
    if (locale === 'th' && menu.description_th) {
      localized.description_localized = menu.description_th;
    } else {
      localized.description_localized = menu.description;
    }
    
    // Add localized category
    if (locale === 'th' && menu.category_th) {
      localized.category_localized = menu.category_th;
    } else {
      // Fallback to translation utility if no database value
      const localization = require('../utils/localization');
      localized.category_localized = localization.getCategoryTranslation(menu.category, locale);
    }
    
    return localized;
  }

  static getLocalizedCategory(categoryData, locale = 'en') {
    if (locale === 'th' && categoryData.category_th) {
      return categoryData.category_th;
    }
    
    // Fallback to translation utility
    const localization = require('../utils/localization');
    return localization.getCategoryTranslation(categoryData.category, locale);
  }
}

module.exports = Menu;