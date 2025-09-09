const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Menu = sequelize.define('menus', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name_th: { type: DataTypes.STRING(100), allowNull: true },
    name_en: { type: DataTypes.STRING(100), allowNull: true },
    category_th: { type: DataTypes.STRING(100), allowNull: true },
    category_en: { type: DataTypes.STRING(100), allowNull: true },
    base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    image_url: { type: DataTypes.TEXT, allowNull: true },
    description_th: { type: DataTypes.TEXT, allowNull: true },
    description_en: { type: DataTypes.TEXT, allowNull: true },
    customizations: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });

  return Menu;
};

