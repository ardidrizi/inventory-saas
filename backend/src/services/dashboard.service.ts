import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';

const activeProductFilter = {
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
};

export const getStats = async () => {
  const [totalProducts, totalOrders, totalRevenue, lowStockProducts, userCount, recentOrders, ordersByStatus] =
    await Promise.all([
      Product.countDocuments(activeProductFilter),
      Order.countDocuments(),
      Order.aggregate([
        {
          $match: {
            $expr: {
              $ne: [{ $toLower: { $ifNull: ['$status', ''] } }, 'cancelled'],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$totalAmount', '$total'] } },
          },
        },
      ]),
      Product.countDocuments({
        ...activeProductFilter,
        $expr: { $lte: [{ $ifNull: ['$quantity', '$stock'] }, 10] },
      }),
      User.countDocuments(),
      Order.find()
        .sort({ createdAt: -1, _id: -1 })
        .limit(5)
        .select('orderNumber customer totalAmount total status createdAt'),
      Order.aggregate([
        {
          $group: {
            _id: { $toLower: { $ifNull: ['$status', 'pending'] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const revenueOverTime = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        $expr: {
          $ne: [{ $toLower: { $ifNull: ['$status', ''] } }, 'cancelled'],
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$total'] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalProducts,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total ?? 0,
    lowStockProducts,
    userCount,
    recentOrders: recentOrders.map((order) => ({
      ...order.toObject(),
      totalAmount: order.totalAmount ?? (order as { total?: number }).total ?? 0,
    })),
    ordersByStatus: Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count])),
    revenueOverTime,
  };
};
