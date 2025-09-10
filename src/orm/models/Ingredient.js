const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ingredient = sequelize.define('ingredients', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false, unique: true },
    unit: { type: DataTypes.TEXT, allowNull: false },
    stock: { type: DataTypes.DECIMAL, allowNull: false, defaultValue: 0 },
  });

  return Ingredient;
};

