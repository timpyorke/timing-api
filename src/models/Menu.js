const orm = require('../orm');

class Menu {
  static async findAll(activeOnly = true, locale = require('../utils/constants').DEFAULT_LOCALE) {
    const { Menu } = orm.models;
    const where = activeOnly ? { active: true } : {};
    const menus = await Menu.findAll({ where, order: [['category_en', 'ASC'], ['name_en', 'ASC']] });
    return menus.map(m => this.addLocalizedFields(m.get({ plain: true }), locale));
  }

  static async findById(id, locale = require('../utils/constants').DEFAULT_LOCALE) {
    const { Menu } = orm.models;
    const menu = await Menu.findByPk(id);
    return menu ? this.addLocalizedFields(menu.get({ plain: true }), locale) : null;
  }

  static async findByIds(ids, locale = require('../utils/constants').DEFAULT_LOCALE) {
    const { Menu } = orm.models;
    const menus = await Menu.findAll({ where: { id: ids } });
    return menus.map(m => this.addLocalizedFields(m.get({ plain: true }), locale));
  }

  static async create(menuData) {
    const { Menu } = orm.models;
    const created = await Menu.create({
      name_th: menuData.name_th || null,
      name_en: menuData.name_en || null,
      category_th: menuData.category_th || null,
      category_en: menuData.category_en || null,
      base_price: menuData.base_price,
      image_url: menuData.image_url || null,
      description_th: menuData.description_th || null,
      description_en: menuData.description_en || null,
      customizations: menuData.customizations || {},
      active: menuData.active ?? true,
    });
    return created.get({ plain: true });
  }

  static async update(id, menuData) {
    const { Menu } = orm.models;
    await Menu.update({
      name_th: menuData.name_th || null,
      name_en: menuData.name_en || null,
      category_th: menuData.category_th || null,
      category_en: menuData.category_en || null,
      base_price: menuData.base_price,
      image_url: menuData.image_url || null,
      description_th: menuData.description_th || null,
      description_en: menuData.description_en || null,
      customizations: menuData.customizations || {},
      active: menuData.active,
    }, { where: { id } });
    const updated = await Menu.findByPk(id);
    return updated ? updated.get({ plain: true }) : null;
  }

  static async delete(id) {
    const { Menu } = orm.models;
    const existing = await Menu.findByPk(id);
    if (!existing) return null;
    await Menu.destroy({ where: { id } });
    return existing.get({ plain: true });
  }

  static async getMenuByCategory(locale = require('../utils/constants').DEFAULT_LOCALE) {
    const { Menu } = orm.models;
    const menus = await Menu.findAll({ where: { active: true } });
    const plain = menus.map(m => m.get({ plain: true }));
    // Group by category pair
    const groups = new Map();
    for (const item of plain) {
      const key = `${item.category_th || ''}||${item.category_en || ''}`;
      if (!groups.has(key)) {
        groups.set(key, { category_th: item.category_th, category_en: item.category_en, items: [] });
      }
      groups.get(key).items.push(item);
    }
    // Sort groups and items by localized values
    const sorted = Array.from(groups.values()).sort((a, b) => {
      const ca = this.getLocalizedCategory(a, locale) || '';
      const cb = this.getLocalizedCategory(b, locale) || '';
      return String(ca).localeCompare(String(cb));
    });
    return sorted.map(category => ({
      category: this.getLocalizedCategory(category, locale),
      items: category.items
        .map(item => this.addLocalizedFields({ ...item }, locale))
        .sort((x, y) => String(x.name || '').localeCompare(String(y.name || '')))
    }));
  }

  static addLocalizedFields(menu, locale = require('../utils/constants').DEFAULT_LOCALE) {
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

  static getLocalizedCategory(categoryData, locale = require('../utils/constants').DEFAULT_LOCALE) {
    if (locale === 'th' && categoryData.category_th) {
      return categoryData.category_th;
    } else if (locale === 'en' && categoryData.category_en) {
      return categoryData.category_en;
    }
    
    return categoryData.category;
  }
}

module.exports = Menu;
