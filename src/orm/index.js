const sequelize = require('./sequelize');

// Lazy model registration to avoid circular deps
const models = {};

models.Menu = require('./models/Menu')(sequelize);
models.Order = require('./models/Order')(sequelize);
models.OrderItem = require('./models/OrderItem')(sequelize);
models.LineToken = require('./models/LineToken')(sequelize);

// Associations
models.Order.hasMany(models.OrderItem, { as: 'items', foreignKey: 'order_id' });
models.OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
models.OrderItem.belongsTo(models.Menu, { as: 'menu', foreignKey: 'menu_id' });

module.exports = { sequelize, models };
