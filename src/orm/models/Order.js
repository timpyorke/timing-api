const { DataTypes } = require('sequelize');
const { ORDER_STATUS } = require('../../utils/constants');

module.exports = (sequelize) => {
  const Order = sequelize.define('orders', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.STRING(100), allowNull: true },
    customer_info: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: ORDER_STATUS.PENDING },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    // Map "notes" model attribute to legacy DB column "note"
    // The physical column name in the database is "note" (singular)
    notes: { type: DataTypes.STRING(100), allowNull: true, field: 'notes' },
    // customer_locale column may not exist in some DBs; omit to prevent SELECT errors
  });

  return Order;
};
