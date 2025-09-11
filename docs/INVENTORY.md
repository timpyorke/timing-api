# Inventory Module

The inventory module tracks ingredients and stock movements, and ties menu items to ingredient recipes. Orders automatically deduct or restore stock.

## Tables

- `ingredients`
  - `id`, `name` (unique), `unit`, `stock`, `created_at`, `updated_at`
- `menu_ingredients`
  - `menu_id`, `ingredient_id`, `quantity_per_unit`
- `stock_movements`
  - `id`, `ingredient_id`, `change`, `reason`, `order_id`, `meta`, `created_at`

Created via migration: `migrations/20250909_01_create_inventory.js`

## Model Layer

- `src/models/Inventory.js` (Sequelize ORM)
  - `upsertIngredient({ name, unit })`
  - `setStockByName(name, quantity)`
  - `addStockByName(name, quantity, reason?)`
  - `setRecipe(menuId, [{ ingredient_name, quantity }])`
  - `getRecipe(menuId)`
  - `checkAndDeductStockForOrder(items, transaction?)`
  - `restoreStockForOrder(items, transaction?)`

## Order Integration

- Create Order: deducts stock atomically with order creation
- Update Order: computes delta per menu and adjusts stock
- Cancel Order: restores stock
- Delete Order: restores stock if not already cancelled

## Admin Endpoints

- `GET /api/admin/ingredients` — list ingredients and stock
- `POST /api/admin/ingredients` — upsert ingredient, optionally set `stock`
- `POST /api/admin/ingredients/add-stock` — add to current stock
- `POST /api/admin/menu/:id/recipe` — set menu recipe

See Swagger at `/api-docs` for request/response schemas.

## Notes

- DECIMAL fields are handled as numbers in responses
- All stock writes are wrapped in transactions with row-level locks
- Use the Postman collection in `docs/postman_collection.json` for quick testing

