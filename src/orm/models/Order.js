const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('orders', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.STRING(100), allowNull: true },
    customer_info: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    customer_locale: { type: DataTypes.STRING(5), allowNull: true },
  });

  return Order;
};
