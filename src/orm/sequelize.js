const { Sequelize } = require('sequelize');

// Initialize Sequelize using DATABASE_URL and align pool + SSL settings
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : undefined,
  },
  logging: false,
  pool: {
    max: 20,
    min: 2,
    idle: 10000,
    acquire: 60000,
    evict: 1000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,
  },
});

module.exports = sequelize;

