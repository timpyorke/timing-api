const { executeQuery } = require('../utils/database');

class Inventory {
  static async upsertIngredient({ name, unit }) {
    const query = `
      INSERT INTO ingredients (name, unit)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET unit = EXCLUDED.unit, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await executeQuery(query, [name, unit]);
    return result.rows[0];
  }

  static async setStockByName(name, quantity) {
    const result = await executeQuery('SELECT * FROM ingredients WHERE name = $1', [name]);
    if (!result.rows[0]) throw new Error(`Ingredient not found: ${name}`);
    const ing = result.rows[0];
    const delta = Number(quantity) - Number(ing.stock);
    await executeQuery('UPDATE ingredients SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [quantity, ing.id]);
    await executeQuery('INSERT INTO stock_movements (ingredient_id, change, reason) VALUES ($1, $2, $3)', [ing.id, delta, 'set_stock']);
    return { ...ing, stock: quantity };
  }

  static async addStockByName(name, quantity, reason = 'add_stock') {
    const result = await executeQuery('SELECT * FROM ingredients WHERE name = $1', [name]);
    if (!result.rows[0]) throw new Error(`Ingredient not found: ${name}`);
    const ing = result.rows[0];
    const newStock = Number(ing.stock) + Number(quantity);
    await executeQuery('UPDATE ingredients SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStock, ing.id]);
    await executeQuery('INSERT INTO stock_movements (ingredient_id, change, reason) VALUES ($1, $2, $3)', [ing.id, quantity, reason]);
    return { ...ing, stock: newStock };
  }

  static async listIngredients() {
    const result = await executeQuery('SELECT * FROM ingredients ORDER BY name');
    return result.rows;
  }

  static async setRecipe(menuId, recipe) {
    // recipe: [{ ingredient_name, quantity }, ...]
    // Ensure ingredients exist, then upsert mapping
    for (const r of recipe) {
      const name = r.ingredient_name || r.name;
      const qty = Number(r.quantity);
      if (!name || !Number.isFinite(qty) || qty <= 0) {
        throw new Error('Invalid recipe item');
      }
      // Create ingredient if not exists? unit must be present initially via upsertIngredient API
      const ingRes = await executeQuery('SELECT id FROM ingredients WHERE name = $1', [name]);
      if (!ingRes.rows[0]) {
        throw new Error(`Ingredient not found for recipe: ${name}`);
      }
      const ingId = ingRes.rows[0].id;
      await executeQuery(`
        INSERT INTO menu_ingredients (menu_id, ingredient_id, quantity_per_unit)
        VALUES ($1, $2, $3)
        ON CONFLICT (menu_id, ingredient_id)
        DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit
      `, [menuId, ingId, qty]);
    }
    return true;
  }

  static async getRecipe(menuId) {
    const result = await executeQuery(`
      SELECT mi.menu_id, mi.quantity_per_unit, i.id as ingredient_id, i.name, i.unit
      FROM menu_ingredients mi
      JOIN ingredients i ON mi.ingredient_id = i.id
      WHERE mi.menu_id = $1
    `, [menuId]);
    return result.rows;
  }

  static async checkAndDeductStockForOrder(client, items) {
    // items: [{ menu_id, quantity }]
    // 1) Aggregate required ingredients
    const required = new Map(); // key: ingredient_id, value: { name, unit, requiredQty }
    for (const item of items) {
      const res = await client.query(`
        SELECT i.id, i.name, i.unit, mi.quantity_per_unit
        FROM menu_ingredients mi
        JOIN ingredients i ON mi.ingredient_id = i.id
        WHERE mi.menu_id = $1
      `, [item.menu_id]);
      for (const row of res.rows) {
        const needed = Number(row.quantity_per_unit) * Number(item.quantity);
        if (!required.has(row.id)) {
          required.set(row.id, { name: row.name, unit: row.unit, requiredQty: 0 });
        }
        required.get(row.id).requiredQty += needed;
      }
    }

    // 2) Check stock availability
    for (const [ingId, info] of required.entries()) {
      const stockRes = await client.query('SELECT stock FROM ingredients WHERE id = $1 FOR UPDATE', [ingId]);
      if (!stockRes.rows[0]) throw new Error(`Ingredient missing: ${info.name}`);
      const current = Number(stockRes.rows[0].stock);
      if (current < info.requiredQty - 1e-9) {
        throw new Error(`Insufficient stock for ${info.name}: need ${info.requiredQty} ${info.unit}, have ${current}`);
      }
    }

    // 3) Deduct stock and record movements
    for (const [ingId, info] of required.entries()) {
      await client.query('UPDATE ingredients SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [info.requiredQty, ingId]);
      await client.query('INSERT INTO stock_movements (ingredient_id, change, reason) VALUES ($1, $2, $3)', [ingId, -info.requiredQty, 'order_deduction']);
    }
  }
}

module.exports = Inventory;

