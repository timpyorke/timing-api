const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockMovement = sequelize.define('stock_movements', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ingredient_id: { type: DataTypes.INTEGER, allowNull: false },
    change: { type: DataTypes.DECIMAL, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    order_id: { type: DataTypes.INTEGER, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, {
    createdAt: 'created_at',
    updatedAt: false,
  });

  return StockMovement;
};

