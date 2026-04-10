import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';

const activeProductFilter = {
  $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
};

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_LIMIT = 20;
const TOP_SELLING_LIMIT = 5;
const NORMALIZED_QUANTITY_EXPR = { $ifNull: ['$quantity', '$stock'] };

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
        $lte: [
          NORMALIZED_QUANTITY_EXPR,
          { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] },
        ],
      },
    }),
    Product.aggregate([
      {
        $match: {
          ...activeProductFilter,
          $expr: {
            $lte: [NORMALIZED_QUANTITY_EXPR, { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] }],
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          sku: 1,
          category: 1,
          price: 1,
          quantity: NORMALIZED_QUANTITY_EXPR,
        },
      },
      { $sort: { quantity: 1, name: 1 } },
      { $limit: LOW_STOCK_LIMIT },
    ]),
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
          totalRevenue: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$items.unitPrice', '$items.price'] }] } },
          orderCount: { $sum: 1 },
        },
      },
      {
        $facet: {
          topByQuantity: [{ $sort: { totalQuantitySold: -1, totalRevenue: -1 } }, { $limit: TOP_SELLING_LIMIT }],
          topByRevenue: [{ $sort: { totalRevenue: -1, totalQuantitySold: -1 } }, { $limit: TOP_SELLING_LIMIT }],
        },
      },
      {
        $project: {
          topSellingProducts: {
            $map: {
              input: {
                $objectToArray: {
                  $arrayToObject: {
                    $map: {
                      input: { $concatArrays: ['$topByQuantity', '$topByRevenue'] },
                      as: 'product',
                      in: {
                        k: { $toString: '$$product._id' },
                        v: '$$product',
                      },
                    },
                  },
                },
              },
              as: 'entry',
              in: '$$entry.v',
            },
          },
        },
      },
      { $unwind: '$topSellingProducts' },
      { $replaceRoot: { newRoot: '$topSellingProducts' } },
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
