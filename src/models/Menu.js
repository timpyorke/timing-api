const { executeQuery } = require('../utils/database');

class Menu {
  static async findAll(activeOnly = true, locale = 'en') {
    const query = activeOnly 
      ? 'SELECT * FROM menus WHERE active = true ORDER BY category_en, name_en'
      : 'SELECT * FROM menus ORDER BY category_en, name_en';
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
      INSERT INTO menus (name_th, name_en, category_th, category_en, base_price, image_url, description_th, description_en, customizations, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await executeQuery(query, [
      menuData.name_th || null,
      menuData.name_en || null,
      menuData.category_th || null,
      menuData.category_en || null,
      menuData.base_price,
      menuData.image_url || null,
      menuData.description_th || null,
      menuData.description_en || null,
      menuData.customizations || {},
      menuData.active ?? true
    ]);
    return result.rows[0];
  }

  static async update(id, menuData) {
    const query = `
      UPDATE menus 
      SET name_th = $1, name_en = $2, category_th = $3, category_en = $4, base_price = $5, image_url = $6, 
          description_th = $7, description_en = $8, customizations = $9, active = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;
    const result = await executeQuery(query, [
      menuData.name_th || null,
      menuData.name_en || null,
      menuData.category_th || null,
      menuData.category_en || null,
      menuData.base_price,
      menuData.image_url || null,
      menuData.description_th || null,
      menuData.description_en || null,
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
    // Optimized query with better ordering and null handling
    const query = `
      SELECT 
        category_th,
        category_en,
        json_agg(
          json_build_object(
            'id', id,
            'name_th', name_th,
            'name_en', name_en,
            'description_th', description_th,
            'description_en', description_en,
            'base_price', base_price,
            'image_url', image_url,
            'customizations', COALESCE(customizations, '{}'::jsonb)
          ) ORDER BY 
            CASE WHEN $1 = 'th' THEN COALESCE(name_th, name_en) 
                 ELSE COALESCE(name_en, name_th) END
        ) as items
      FROM menus 
      WHERE active = true 
        AND (name_th IS NOT NULL OR name_en IS NOT NULL)
        AND (category_th IS NOT NULL OR category_en IS NOT NULL)
      GROUP BY category_th, category_en
      ORDER BY 
        CASE WHEN $1 = 'th' THEN COALESCE(category_th, category_en) 
             ELSE COALESCE(category_en, category_th) END
    `;
    const result = await executeQuery(query, [locale]);
    
    // Add localized fields for categories and items
    return result.rows.map(category => {
      const localizedCategory = this.getLocalizedCategory(category, locale);
      const localizedItems = category.items.map(item => {
        // Add category information to each item before localizing
        const itemWithCategory = {
          ...item,
          category_th: category.category_th,
          category_en: category.category_en
        };
        return this.addLocalizedFields(itemWithCategory, locale);
      });
      
      return {
        category: localizedCategory,
        items: localizedItems
      };
    });
  }

  static addLocalizedFields(menu, locale = 'en') {
    const localized = { ...menu };
    
    // Set localized values based on the requested locale
    // For name field
    if (locale === 'th' && menu.name_th) {
      localized.name = menu.name_th;
    } else if (locale === 'en' && menu.name_en) {
      localized.name = menu.name_en;
    } else {
      // Fallback: use English if available, otherwise Thai, otherwise original
      localized.name = menu.name_en || menu.name_th || menu.name;
    }
    
    // For category field
    if (locale === 'th' && menu.category_th) {
      localized.category = menu.category_th;
    } else if (locale === 'en' && menu.category_en) {
      localized.category = menu.category_en;
    } else {
      // Fallback: use English if available, otherwise Thai, otherwise original
      localized.category = menu.category_en || menu.category_th || menu.category;
    }
    
    // For description field
    if (locale === 'th' && menu.description_th) {
      localized.description = menu.description_th;
    } else if (locale === 'en' && menu.description_en) {
      localized.description = menu.description_en;
    } else {
      // Fallback: use English if available, otherwise Thai, otherwise original
      localized.description = menu.description_en || menu.description_th || menu.description;
    }
    
    // Keep customizations as simple object without translation structure
    localized.customizations = menu.customizations || {};
    
    // Remove the individual language fields to clean up response
    delete localized.name_th;
    delete localized.name_en;
    delete localized.description_th;
    delete localized.description_en;
    delete localized.category_th;
    delete localized.category_en;
    
    return localized;
  }

  static getLocalizedCategory(categoryData, locale = 'en') {
    if (locale === 'th' && categoryData.category_th) {
      return categoryData.category_th;
    } else if (locale === 'en' && categoryData.category_en) {
      return categoryData.category_en;
    }
    
    return categoryData.category;
  }
}

module.exports = Menu;
