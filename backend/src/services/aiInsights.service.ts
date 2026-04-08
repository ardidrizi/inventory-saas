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

interface InsightsResult {
  summary: string;
  risks: string[];
  opportunities: string[];
  actions: string[];
}

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

const createHttpError = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

const parseInsightsResponse = (content: string): InsightsResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw createHttpError('AI response was not valid JSON', 502);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw createHttpError('AI response was malformed', 502);
  }

  const result = parsed as Record<string, unknown>;

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const summary = typeof result.summary === 'string' ? result.summary.trim() : '';
  const risks = asStringArray(result.risks);
  const opportunities = asStringArray(result.opportunities);
  const actions = asStringArray(result.actions);

  if (!summary) {
    throw createHttpError('AI response missing summary', 502);
  }

  return {
    summary,
    risks,
    opportunities,
    actions,
  };
};

const buildStats = async (): Promise<InsightsStats> => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
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
      recentOrderTrend: recentOrderTrendRaw.map((point) => ({
        date: point._id,
        orders: point.orders,
        revenue: point.revenue,
      })),
      categorySummary: categorySummaryRaw.map((item) => ({
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
    'Using ONLY the compact JSON input, return a concise JSON object with this exact shape:',
    '{"summary":"string","risks":["string"],"opportunities":["string"],"actions":["string"]}',
    'Requirements:',
    '- summary: 2-4 sentences business summary.',
    '- risks: low stock and fulfillment risk bullets.',
    '- opportunities: product performance and revenue observations.',
    '- actions: exactly 3 actionable recommendations prioritized by impact.',
    '- Do not include markdown or additional keys.',
    '',
    `Input JSON: ${JSON.stringify(stats)}`,
  ].join('\n');
};

export const generateInsights = async () => {
  const stats = await buildStats();
  const client = await loadOpenAiClient();

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise inventory analytics assistant. Return valid JSON only with summary, risks, opportunities, and actions.',
        },
        {
          role: 'user',
          content: buildPrompt(stats),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw createHttpError('OpenAI returned an empty response', 502);
    }

    const insights = parseInsightsResponse(content);

    return {
      success: true,
      insights,
      stats,
    };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error;
    }

    throw createHttpError('Failed to generate AI insights', 502);
  }
};
