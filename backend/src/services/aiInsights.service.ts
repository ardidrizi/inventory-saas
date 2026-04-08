import { z } from 'zod';
import Product from '../models/Product';
import Order from '../models/Order';
import { env } from '../config/env';

interface ProductStockSummary {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
}

interface RecentTrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface CategorySummary {
  category: string;
  products: number;
  totalQuantity: number;
  inventoryValue: number;
}

export interface InsightsStats {
  totals: {
    products: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    orders: number;
    revenue: number;
  };
  topProductsByStock: ProductStockSummary[];
  bottomProductsByStock: ProductStockSummary[];
  recentOrderTrend: RecentTrendPoint[];
  categorySummary: CategorySummary[];
}

const insightsSchema = z
  .object({
    summary: z.string().min(1),
    risks: z.array(z.string()),
    opportunities: z.array(z.string()),
    actions: z.array(z.string()),
  })
  .strict();

type InsightsResult = z.infer<typeof insightsSchema>;

interface OpenAIChatClient {
  chat: {
    completions: {
      create: (payload: Record<string, unknown>) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

const LOW_STOCK_THRESHOLD = 10;
const TREND_WINDOW_DAYS = 7;

const createHttpError = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10);

const buildFallbackInsights = (stats: InsightsStats): InsightsResult => {
  const hasProducts = stats.totals.products > 0;
  const hasOrders = stats.totals.orders > 0;

  if (!hasProducts && !hasOrders) {
    return {
      summary:
        'No inventory or order history is available yet. Add products and record first orders to unlock meaningful AI insights.',
      risks: ['No operating data yet; forecasting and risk detection are currently limited.'],
      opportunities: ['Initialize product catalog and baseline stock levels to start trend tracking.'],
      actions: [
        'Create core product records with categories and starting quantities.',
        'Start capturing orders to generate demand and revenue trends.',
        'Review low-stock thresholds for each category once data accumulates.',
      ],
    };
  }

  const risks: string[] = [];
  if (stats.totals.outOfStockProducts > 0) {
    risks.push(`${stats.totals.outOfStockProducts} products are currently out of stock.`);
  }
  if (stats.totals.lowStockProducts > 0) {
    risks.push(`${stats.totals.lowStockProducts} products are low on stock (≤ ${LOW_STOCK_THRESHOLD}).`);
  }

  const topProduct = stats.topProductsByStock[0];
  const firstCategory = stats.categorySummary[0];

  return {
    summary:
      `Inventory contains ${stats.totals.products} products and ${stats.totals.orders} orders with total revenue of $${stats.totals.revenue.toFixed(2)}.` +
      (topProduct ? ` Highest-stock item is ${topProduct.name} (${topProduct.quantity} units).` : ''),
    risks: risks.length > 0 ? risks : ['No immediate inventory risk detected from current stock levels.'],
    opportunities: [
      firstCategory
        ? `${firstCategory.category} is the largest category by inventory value at $${firstCategory.inventoryValue.toFixed(2)}.`
        : 'Category-level opportunities will improve as more categorized products are added.',
    ],
    actions: [
      'Prioritize replenishment for out-of-stock and low-stock products.',
      'Review bottom-stock products for reorder timing and demand alignment.',
      'Track weekly order and revenue trend changes to adjust purchasing decisions.',
    ],
  };
};

const parseInsightsResponse = (content: string, stats: InsightsStats): InsightsResult => {
  try {
    const parsed = JSON.parse(content) as unknown;
    const validated = insightsSchema.safeParse(parsed);
    if (!validated.success) {
      return buildFallbackInsights(stats);
    }

    return {
      summary: validated.data.summary.trim(),
      risks: validated.data.risks,
      opportunities: validated.data.opportunities,
      actions: validated.data.actions,
    };
  } catch {
    return buildFallbackInsights(stats);
  }
};

const buildStats = async (): Promise<InsightsStats> => {
  try {
    const trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - (TREND_WINDOW_DAYS - 1));

    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      topProductsByStock,
      bottomProductsByStock,
      totalOrders,
      totalRevenueAgg,
      recentOrderTrendRaw,
      categorySummaryRaw,
    ] = await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false, quantity: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
      Product.countDocuments({ isDeleted: false, quantity: { $lte: 0 } }),
      Product.find({ isDeleted: false })
        .sort({ quantity: -1 })
        .limit(5)
        .select('name sku category quantity'),
      Product.find({ isDeleted: false })
        .sort({ quantity: 1 })
        .limit(5)
        .select('name sku category quantity'),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: trendStartDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalAmount', 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$category',
            products: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            inventoryValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          },
        },
        { $sort: { inventoryValue: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const trendMap = new Map<string, { orders: number; revenue: number }>();
    for (const point of recentOrderTrendRaw as Array<{ _id: string; orders: number; revenue: number }>) {
      trendMap.set(point._id, { orders: point.orders, revenue: point.revenue });
    }

    const recentOrderTrend: RecentTrendPoint[] = [];
    for (let offset = TREND_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const dayKey = toIsoDay(date);
      const dayValue = trendMap.get(dayKey);
      recentOrderTrend.push({
        date: dayKey,
        orders: dayValue?.orders ?? 0,
        revenue: dayValue?.revenue ?? 0,
      });
    }

    return {
      totals: {
        products: totalProducts,
        lowStockProducts,
        outOfStockProducts,
        orders: totalOrders,
        revenue: totalRevenueAgg[0]?.total ?? 0,
      },
      topProductsByStock: topProductsByStock.map((p) => ({
        _id: String(p._id),
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: p.quantity,
      })),
      bottomProductsByStock: bottomProductsByStock.map((p) => ({
        _id: String(p._id),
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: p.quantity,
      })),
      recentOrderTrend,
      categorySummary: categorySummaryRaw
        .filter((item) => typeof item._id === 'string' && item._id.trim().length > 0)
        .map((item) => ({
          category: item._id,
          products: item.products,
          totalQuantity: item.totalQuantity,
          inventoryValue: Number(item.inventoryValue.toFixed(2)),
        })),
    };
  } catch {
    throw createHttpError('Failed to build inventory summary from database', 500);
  }
};

const loadOpenAiClient = async (): Promise<OpenAIChatClient> => {
  if (!env.OPENAI_API_KEY) {
    throw createHttpError('OPENAI_API_KEY is not configured', 500);
  }

  try {
    const module = await import('openai');
    const OpenAI = module.default;
    return new OpenAI({ apiKey: env.OPENAI_API_KEY }) as OpenAIChatClient;
  } catch {
    throw createHttpError('OpenAI SDK is not installed or failed to initialize', 500);
  }
};

const buildPrompt = (stats: InsightsStats) => {
  return [
    'You are an operations analyst for an inventory SaaS business.',
    'Use only the compact JSON input.',
    'Focus on: short business summary, low stock risks, restock suggestions, product performance observations, and 3 actionable recommendations.',
    `Input JSON: ${JSON.stringify(stats)}`,
  ].join('\n');
};

const INSIGHTS_JSON_SCHEMA = {
  name: 'inventory_insights',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      risks: { type: 'array', items: { type: 'string' } },
      opportunities: { type: 'array', items: { type: 'string' } },
      actions: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'risks', 'opportunities', 'actions'],
    additionalProperties: false,
  },
};

export const generateInsights = async () => {
  const stats = await buildStats();

  if (stats.totals.products === 0 && stats.totals.orders === 0) {
    return {
      success: true,
      insights: buildFallbackInsights(stats),
      stats,
    };
  }

  const client = await loadOpenAiClient();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Return strict JSON that matches the provided schema. Do not include markdown or extra keys.',
        },
        {
          role: 'user',
          content: buildPrompt(stats),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: INSIGHTS_JSON_SCHEMA,
      },
    });

    const content = response.choices?.[0]?.message?.content;
    const insights = content ? parseInsightsResponse(content, stats) : buildFallbackInsights(stats);

    return {
      success: true,
      insights,
      stats,
    };
  } catch {
    throw createHttpError('Failed to generate AI insights', 502);
  }
};
