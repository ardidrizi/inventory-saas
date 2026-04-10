import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';

const activeProductFilter = {
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
};

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_LIMIT = 20;
const TOP_SELLING_LIMIT = 5;

export const getStats = async () => {
  const [
    totalProducts,
    totalOrders,
    totalRevenue,
    lowStockProducts,
    lowStockProductList,
    topSellingProducts,
    userCount,
    recentOrders,
    ordersByStatus,
  ] = await Promise.all([
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
      $expr: {
        $and: [
          { $gt: [{ $ifNull: ['$quantity', '$stock'] }, 0] },
          {
            $lte: [
              { $ifNull: ['$quantity', '$stock'] },
              { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] },
            ],
          },
        ],
      },
    }),
    Product.find({
      ...activeProductFilter,
      $expr: {
        $and: [
          { $gt: [{ $ifNull: ['$quantity', '$stock'] }, 0] },
          {
            $lte: [
              { $ifNull: ['$quantity', '$stock'] },
              { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] },
            ],
          },
        ],
      },
    })
      .sort({ quantity: 1, name: 1 })
      .limit(LOW_STOCK_LIMIT)
      .select('_id name sku quantity category price'),
    Order.aggregate([
      {
        $match: {
          $expr: {
            $ne: [{ $toLower: { $ifNull: ['$status', ''] } }, 'cancelled'],
          },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantitySold: -1, totalRevenue: -1 } },
      { $limit: TOP_SELLING_LIMIT },
    ]),
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
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    lowStockProductList,
    topSellingProducts,
    userCount,
    recentOrders: recentOrders.map((order) => ({
      ...order.toObject(),
      totalAmount: order.totalAmount ?? (order as { total?: number }).total ?? 0,
    })),
    ordersByStatus: Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count])),
    revenueOverTime,
  };
};
