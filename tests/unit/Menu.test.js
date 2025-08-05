const Menu = require('../../src/models/Menu');

// Mock the database utility
jest.mock('../../src/utils/database', () => ({
  executeQuery: jest.fn()
}));

const { executeQuery } = require('../../src/utils/database');

describe('Menu Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addLocalizedFields', () => {
    test('should add localized fields for English locale', () => {
      const menu = {
        id: 1,
        name_th: 'กาแฟ',
        name_en: 'Coffee',
        category_th: 'เครื่องดื่ม',
        category_en: 'Drinks',
        description_th: 'กาแฟอร่อย',
        description_en: 'Delicious coffee',
        base_price: 50.00,
        customizations: { sizes: ['S', 'M', 'L'] }
      };

      const result = Menu.addLocalizedFields(menu, 'en');

      expect(result.name).toBe('Coffee');
      expect(result.category).toBe('Drinks');
      expect(result.description).toBe('Delicious coffee');
      expect(result.customizations).toEqual({ sizes: ['S', 'M', 'L'] });
      
      // Should not have individual language fields
      expect(result.name_th).toBeUndefined();
      expect(result.name_en).toBeUndefined();
      expect(result.category_th).toBeUndefined();
      expect(result.category_en).toBeUndefined();
      expect(result.description_th).toBeUndefined();
      expect(result.description_en).toBeUndefined();
    });

    test('should add localized fields for Thai locale', () => {
      const menu = {
        id: 1,
        name_th: 'กาแฟ',
        name_en: 'Coffee',
        category_th: 'เครื่องดื่ม',
        category_en: 'Drinks',
        description_th: 'กาแฟอร่อย',
        description_en: 'Delicious coffee',
        base_price: 50.00
      };

      const result = Menu.addLocalizedFields(menu, 'th');

      expect(result.name).toBe('กาแฟ');
      expect(result.category).toBe('เครื่องดื่ม');
      expect(result.description).toBe('กาแฟอร่อย');
    });

    test('should fallback to English when Thai is not available', () => {
      const menu = {
        id: 1,
        name_en: 'Coffee',
        category_en: 'Drinks',
        description_en: 'Delicious coffee',
        base_price: 50.00
      };

      const result = Menu.addLocalizedFields(menu, 'th');

      expect(result.name).toBe('Coffee');
      expect(result.category).toBe('Drinks');
      expect(result.description).toBe('Delicious coffee');
    });
  });

  describe('findAll', () => {
    test('should return all active menus by default', async () => {
      const mockMenus = [
        { id: 1, name_en: 'Coffee', active: true },
        { id: 2, name_en: 'Tea', active: true }
      ];
      
      executeQuery.mockResolvedValue({ rows: mockMenus });

      const result = await Menu.findAll();

      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM menus WHERE active = true ORDER BY category_en, name_en'
      );
      expect(result).toHaveLength(2);
    });

    test('should return all menus when activeOnly is false', async () => {
      const mockMenus = [
        { id: 1, name_en: 'Coffee', active: true },
        { id: 2, name_en: 'Tea', active: false }
      ];
      
      executeQuery.mockResolvedValue({ rows: mockMenus });

      await Menu.findAll(false);

      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM menus ORDER BY category_en, name_en'
      );
    });
  });
});