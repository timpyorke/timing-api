const sequelize = require('./sequelize');

// Lazy model registration to avoid circular deps
const models = {};

models.Menu = require('./models/Menu')(sequelize);
models.Order = require('./models/Order')(sequelize);
models.OrderItem = require('./models/OrderItem')(sequelize);
models.Ingredient = require('./models/Ingredient')(sequelize);
models.MenuIngredient = require('./models/MenuIngredient')(sequelize);
models.StockMovement = require('./models/StockMovement')(sequelize);
models.LineToken = require('./models/LineToken')(sequelize);

// Associations
models.Order.hasMany(models.OrderItem, { as: 'items', foreignKey: 'order_id' });
models.OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
models.OrderItem.belongsTo(models.Menu, { as: 'menu', foreignKey: 'menu_id' });

// Inventory associations
models.Menu.hasMany(models.MenuIngredient, { as: 'recipe', foreignKey: 'menu_id' });
models.MenuIngredient.belongsTo(models.Menu, { foreignKey: 'menu_id' });
models.MenuIngredient.belongsTo(models.Ingredient, { as: 'ingredient', foreignKey: 'ingredient_id' });
models.Ingredient.hasMany(models.MenuIngredient, { foreignKey: 'ingredient_id' });

models.Ingredient.hasMany(models.StockMovement, { as: 'movements', foreignKey: 'ingredient_id' });
models.StockMovement.belongsTo(models.Ingredient, { foreignKey: 'ingredient_id' });

module.exports = { sequelize, models };
