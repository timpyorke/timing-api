const { models } = require('../orm');
const { Op } = require('sequelize');

/**
 * Compare today's and yesterday's total item sales.
 * Returns: { todayCount, yesterdayCount, difference, brokeRecord }
 */
async function getDailySalesBreak() {
  // Get start/end of today and yesterday
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const endYesterday = new Date(startToday);

  // Get all orders created today and yesterday
  const todayOrders = await models.Order.findAll({
    where: {
      created_at: { [Op.gte]: startToday }
    },
    include: [{ model: models.OrderItem, as: 'items' }]
  });
  const yesterdayOrders = await models.Order.findAll({
    where: {
      created_at: { [Op.gte]: startYesterday, [Op.lt]: endYesterday }
    },
    include: [{ model: models.OrderItem, as: 'items' }]
  });

  // Count total items sold
  const todayCount = todayOrders.reduce((sum, order) => {
    return sum + order.items.reduce((s, item) => s + item.quantity, 0);
  }, 0);
  const yesterdayCount = yesterdayOrders.reduce((sum, order) => {
    return sum + order.items.reduce((s, item) => s + item.quantity, 0);
  }, 0);

  return {
    todayCount,
    yesterdayCount,
    difference: todayCount - yesterdayCount,
    brokeRecord: todayCount > yesterdayCount
  };
}

module.exports = { getDailySalesBreak };
