const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LineToken = sequelize.define('line_tokens', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    line_user_id: { type: DataTypes.TEXT, allowNull: false, unique: true },
    user_id: { type: DataTypes.STRING(128), allowNull: true },
    user_info: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return LineToken;
};

