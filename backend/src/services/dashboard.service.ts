import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';

export const getStats = async () => {
  const [totalProducts, totalOrders, totalRevenue, lowStockProducts, userCount, recentOrders, ordersByStatus] =
    await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.countDocuments({ isDeleted: false, quantity: { $lte: 10 } }),
      User.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name'),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const revenueOverTime = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
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
    recentOrders,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count])),
    revenueOverTime,
  };
};
