const { models } = require('../orm');
const { Op, fn, col } = require('sequelize');

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

  const sumItemsBetween = async (start, end = null) => {
    const orderWhere = {};
    if (start) orderWhere.created_at = { [Op.gte]: start };
    if (end) orderWhere.created_at = { ...(orderWhere.created_at || {}), [Op.lt]: end };

    const [result] = await models.OrderItem.findAll({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'items_count']],
      include: [{
        model: models.Order,
        required: true,
        attributes: [],
        where: orderWhere,
      }],
      raw: true,
    });

    return parseInt(result?.items_count, 10) || 0;
  };

  const todayCount = await sumItemsBetween(startToday);
  const yesterdayCount = await sumItemsBetween(startYesterday, endYesterday);

  return {
    todayCount,
    yesterdayCount,
    difference: todayCount - yesterdayCount,
    brokeRecord: todayCount > yesterdayCount
  };
}

module.exports = { getDailySalesBreak };
