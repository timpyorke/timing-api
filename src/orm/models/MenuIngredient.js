const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MenuIngredient = sequelize.define('menu_ingredients', {
    menu_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    ingredient_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    quantity_per_unit: { type: DataTypes.DECIMAL, allowNull: false },
  }, {
    timestamps: false,
  });

  return MenuIngredient;
};

