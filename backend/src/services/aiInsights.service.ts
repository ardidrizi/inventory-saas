import { z } from 'zod';
import Product from '../models/Product';
import Order from '../models/Order';
import { env } from '../config/env';

interface ProductStockSummary {
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

export interface AIInsightsStats {
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

const aiInsightsSchema = z
  .object({
    summary: z.string().min(1),
    risks: z.array(z.string()),
    opportunities: z.array(z.string()),
    actions: z.array(z.string()),
  })
  .strict();

type AIInsightsResult = z.infer<typeof aiInsightsSchema>;

interface OpenAIChatClient {
  chat: {
    completions: {
      create: (payload: Record<string, unknown>) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const TREND_WINDOW_DAYS = 7;
const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000;

const createHttpError = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10);

const toProductStockSummary = (product: {
  name: string;
  sku: string;
  category: string;
  quantity: number;
}): ProductStockSummary => ({
  name: product.name,
  sku: product.sku,
  category: product.category,
  quantity: product.quantity,
});

const buildFallbackInsights = (stats: AIInsightsStats): AIInsightsResult => {
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
    risks.push(
      `${stats.totals.lowStockProducts} products are low on stock at or below their configured thresholds.`,
    );
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

const parseAIInsightsResponse = (
  content: string,
  stats: AIInsightsStats,
): { insights: AIInsightsResult; usedFallback: boolean } => {
  try {
    const parsed = JSON.parse(content) as unknown;
    const validated = aiInsightsSchema.safeParse(parsed);

    if (!validated.success) {
      return { insights: buildFallbackInsights(stats), usedFallback: true };
    }

    return {
      insights: {
        summary: validated.data.summary.trim(),
        risks: validated.data.risks,
        opportunities: validated.data.opportunities,
        actions: validated.data.actions,
      },
      usedFallback: false,
    };
  } catch {
    return { insights: buildFallbackInsights(stats), usedFallback: true };
  }
};

const buildStats = async (): Promise<AIInsightsStats> => {
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
      Product.countDocuments({
        isDeleted: false,
        $expr: {
          $and: [
            { $gt: ['$quantity', 0] },
            {
              $lte: ['$quantity', { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] }],
            },
          ],
        },
      }),
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
      const dateKey = toIsoDay(date);
      const trend = trendMap.get(dateKey);
      recentOrderTrend.push({
        date: dateKey,
        orders: trend?.orders ?? 0,
        revenue: trend?.revenue ?? 0,
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
      topProductsByStock: topProductsByStock.map((product) =>
        toProductStockSummary({
          name: product.name,
          sku: product.sku,
          category: product.category,
          quantity: product.quantity,
        }),
      ),
      bottomProductsByStock: bottomProductsByStock.map((product) =>
        toProductStockSummary({
          name: product.name,
          sku: product.sku,
          category: product.category,
          quantity: product.quantity,
        }),
      ),
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
    throw createHttpError('Failed to build AI insights statistics', 500);
  }
};

const getOpenAIClient = async (): Promise<OpenAIChatClient> => {
  const apiKey = env.OPENAI_API_KEY;
  const hasApiKey = Boolean(apiKey);
  console.info(`OPENAI_API_KEY present: ${hasApiKey}`);

  if (!apiKey) {
    throw createHttpError('OPENAI_API_KEY is missing', 500);
  }

  let OpenAI: unknown;
  try {
    const openAiModule = await import('openai');
    OpenAI = openAiModule.default;
  } catch {
    throw createHttpError('OpenAI package import failed', 500);
  }

  try {
    const client = new (OpenAI as new (config: { apiKey: string }) => OpenAIChatClient)({
      apiKey,
    });
    console.info('OpenAI client initialization succeeded');
    return client;
  } catch {
    throw createHttpError('OpenAI client initialization failed', 500);
  }
};

const buildPrompt = (stats: AIInsightsStats) =>
  [
    'You are an operations analyst for an inventory SaaS business.',
    'Use only the compact JSON input and avoid assumptions not grounded in the data.',
    'Focus on: short business summary, low stock risks, restock suggestions, product performance observations, and exactly 3 actionable recommendations.',
    `Input JSON: ${JSON.stringify(stats)}`,
  ].join('\n');


interface OpenAIErrorDetails {
  status?: number;
  code?: string;
  type?: string;
  requestId?: string;
}

const isQuotaError = (details: OpenAIErrorDetails): boolean =>
  details.status === 429 || details.code === 'insufficient_quota';

const getOpenAIErrorDetails = (error: unknown): OpenAIErrorDetails => {
  const openAIError = error as {
    status?: number;
    code?: string;
    type?: string;
    request_id?: string;
    requestId?: string;
    headers?: Record<string, string | undefined>;
  };

  return {
    status: openAIError.status,
    code: openAIError.code,
    type: openAIError.type,
    requestId: openAIError.request_id ?? openAIError.requestId ?? openAIError.headers?.['x-request-id'],
  };
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

interface InsightsResponse {
  success: true;
  insights: AIInsightsResult;
  stats: AIInsightsStats;
  fallback: boolean;
  cached: boolean;
  generatedAt: string;
}

let insightsCache: { expiresAt: number; payload: Omit<InsightsResponse, 'cached'> } | null = null;

const getCachedInsights = (): InsightsResponse | null => {
  if (!insightsCache) {
    return null;
  }

  if (Date.now() >= insightsCache.expiresAt) {
    insightsCache = null;
    return null;
  }

  return {
    ...insightsCache.payload,
    cached: true,
  };
};

const setInsightsCache = (
  payload: Omit<InsightsResponse, 'cached' | 'generatedAt'>,
): InsightsResponse => {
  const generatedAt = new Date().toISOString();
  insightsCache = {
    payload: {
      ...payload,
      generatedAt,
    },
    expiresAt: Date.now() + INSIGHTS_CACHE_TTL_MS,
  };

  return {
    ...payload,
    generatedAt,
    cached: false,
  };
};

export const generateInsights = async () => {
  const cachedInsights = getCachedInsights();
  if (cachedInsights) {
    return cachedInsights;
  }

  const stats = await buildStats();

  if (stats.totals.products === 0 && stats.totals.orders === 0) {
    return setInsightsCache({
      success: true,
      insights: buildFallbackInsights(stats),
      stats,
      fallback: true,
    });
  }

  try {
    const client = await getOpenAIClient();
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
    const parsed = content
      ? parseAIInsightsResponse(content, stats)
      : { insights: buildFallbackInsights(stats), usedFallback: true };

    return setInsightsCache({
      success: true,
      insights: parsed.insights,
      stats,
      fallback: parsed.usedFallback,
    });
  } catch (error) {
    const details = getOpenAIErrorDetails(error);
    console.error('OpenAI request failed while generating AI insights', details);
    const fallbackInsights = buildFallbackInsights(stats);

    if (isQuotaError(details)) {
      console.warn('OpenAI quota limit reached; returning locally generated fallback insights');
    } else {
      console.warn('OpenAI unavailable or request failed; returning locally generated fallback insights');
    }

    return setInsightsCache({
      success: true,
      insights: fallbackInsights,
      stats,
      fallback: true,
    });
  }
};
