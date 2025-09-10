const orm = require('../orm');

class Inventory {
  static async upsertIngredient({ name, unit }) {
    const { Ingredient } = orm.models;
    // Use upsert for idempotency; returns [instance, created] on Postgres
    const res = await Ingredient.upsert({ name, unit }, { returning: true });
    // Sequelize v6 returns [instance, created] in Postgres
    if (Array.isArray(res) && res[0]) return res[0].get({ plain: true });
    // Fallback: fetch the row
    const row = await Ingredient.findOne({ where: { name } });
    return row.get({ plain: true });
  }

  static async setStockByName(name, quantity) {
    const { sequelize, models: { Ingredient, StockMovement } } = orm;
    return await sequelize.transaction(async (t) => {
      const ing = await Ingredient.findOne({ where: { name }, transaction: t, lock: t.LOCK.UPDATE });
      if (!ing) throw new Error(`Ingredient not found: ${name}`);
      const current = Number(ing.stock || 0);
      const target = Number(quantity);
      const delta = target - current;
      await ing.update({ stock: target }, { transaction: t });
      await StockMovement.create({ ingredient_id: ing.id, change: delta, reason: 'set_stock' }, { transaction: t });
      return { ...ing.get({ plain: true }), stock: target };
    });
  }

  static async addStockByName(name, quantity, reason = 'add_stock') {
    const { sequelize, models: { Ingredient, StockMovement } } = orm;
    return await sequelize.transaction(async (t) => {
      const ing = await Ingredient.findOne({ where: { name }, transaction: t, lock: t.LOCK.UPDATE });
      if (!ing) throw new Error(`Ingredient not found: ${name}`);
      const newStock = Number(ing.stock || 0) + Number(quantity);
      await ing.update({ stock: newStock }, { transaction: t });
      await StockMovement.create({ ingredient_id: ing.id, change: Number(quantity), reason }, { transaction: t });
      return { ...ing.get({ plain: true }), stock: newStock };
    });
  }

  static async listIngredients() {
    const { Ingredient } = orm.models;
    const rows = await Ingredient.findAll({ order: [['name', 'ASC']] });
    return rows.map(r => r.get({ plain: true }));
  }

  static async setRecipe(menuId, recipe) {
    // recipe: [{ ingredient_name, quantity }, ...]
    // Ensure ingredients exist, then upsert mapping
    const { sequelize, models: { Ingredient, MenuIngredient } } = orm;
    return await sequelize.transaction(async (t) => {
      for (const r of recipe) {
        const name = r.ingredient_name || r.name;
        const qty = Number(r.quantity);
        if (!name || !Number.isFinite(qty) || qty <= 0) {
          throw new Error('Invalid recipe item');
        }
        const ing = await Ingredient.findOne({ where: { name }, transaction: t });
        if (!ing) throw new Error(`Ingredient not found for recipe: ${name}`);
        await MenuIngredient.upsert({ menu_id: menuId, ingredient_id: ing.id, quantity_per_unit: qty }, { transaction: t });
      }
      return true;
    });
  }

  static async getRecipe(menuId) {
    const { MenuIngredient, Ingredient } = orm.models;
    const rows = await MenuIngredient.findAll({
      where: { menu_id: menuId },
      include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'unit'] }],
      order: [[{ model: Ingredient, as: 'ingredient' }, 'name', 'ASC']],
    });
    return rows.map(r => {
      const plain = r.get({ plain: true });
      return {
        menu_id: plain.menu_id,
        quantity_per_unit: Number(plain.quantity_per_unit),
        ingredient_id: plain.ingredient?.id,
        name: plain.ingredient?.name,
        unit: plain.ingredient?.unit,
      };
    });
  }

  // New ORM-based stock deduction; accepts an optional Sequelize transaction
  static async checkAndDeductStockForOrder(arg1, arg2 = null) {
    // Support both legacy signature (client, items) and new (items, transaction)
    const items = Array.isArray(arg1) ? arg1 : arg2; // items always array in either form
    const transaction = Array.isArray(arg1) ? arg2 : null;
    if (!Array.isArray(items)) throw new Error('items array is required');
    // items: [{ menu_id, quantity }]
    const { sequelize, models: { MenuIngredient, Ingredient, StockMovement } } = orm;
    const run = async (t) => {
      // 1) Aggregate required ingredients
      const required = new Map(); // key: ingredient_id -> { name, unit, requiredQty }
      for (const item of items) {
        const recipeRows = await MenuIngredient.findAll({
          where: { menu_id: item.menu_id },
          include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'unit'] }],
          transaction: t,
        });
        for (const r of recipeRows) {
          const ing = r.ingredient;
          if (!ing) continue;
          const needed = Number(r.quantity_per_unit) * Number(item.quantity);
          if (!required.has(ing.id)) required.set(ing.id, { name: ing.name, unit: ing.unit, requiredQty: 0 });
          required.get(ing.id).requiredQty += needed;
        }
      }

      // 2) Check stock availability with row-level locks
      for (const [ingId, info] of required.entries()) {
        const ing = await Ingredient.findByPk(ingId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!ing) throw new Error(`Ingredient missing: ${info.name}`);
        const current = Number(ing.stock || 0);
        if (current < info.requiredQty - 1e-9) {
          throw new Error(`Insufficient stock for ${info.name}: need ${info.requiredQty} ${info.unit}, have ${current}`);
        }
      }

      // 3) Deduct stock and record movements
      for (const [ingId, info] of required.entries()) {
        const ing = await Ingredient.findByPk(ingId, { transaction: t, lock: t.LOCK.UPDATE });
        await ing.update({ stock: Number(ing.stock || 0) - Number(info.requiredQty) }, { transaction: t });
        await StockMovement.create({ ingredient_id: ingId, change: -Number(info.requiredQty), reason: 'order_deduction' }, { transaction: t });
      }
    };

    if (transaction) {
      return run(transaction);
    }
    return sequelize.transaction(run);
  }

  // Restore stock for an order (e.g., on cancellation)
  static async restoreStockForOrder(items, transaction = null) {
    const { sequelize, models: { MenuIngredient, Ingredient, StockMovement } } = orm;
    const run = async (t) => {
      const restoreMap = new Map(); // ingredient_id -> totalQty
      for (const item of items) {
        const recipeRows = await MenuIngredient.findAll({ where: { menu_id: item.menu_id }, transaction: t });
        for (const r of recipeRows) {
          const addQty = Number(r.quantity_per_unit) * Number(item.quantity);
          restoreMap.set(r.ingredient_id, Number(restoreMap.get(r.ingredient_id) || 0) + addQty);
        }
      }
      for (const [ingId, qty] of restoreMap.entries()) {
        const ing = await Ingredient.findByPk(ingId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!ing) continue;
        await ing.update({ stock: Number(ing.stock || 0) + Number(qty) }, { transaction: t });
        await StockMovement.create({ ingredient_id: ingId, change: Number(qty), reason: 'order_cancelled_restore' }, { transaction: t });
      }
    };
    if (transaction) return run(transaction);
    return sequelize.transaction(run);
  }
}

module.exports = Inventory;
