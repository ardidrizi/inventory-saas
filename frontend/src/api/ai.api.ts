import client from './client';

export interface AIInsights {
  summary: string;
  risks: string[];
  opportunities: string[];
  actions: string[];
}

export interface AIInsightsStats {
  totals: {
    products: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    orders: number;
    revenue: number;
  };
  topProductsByStock: Array<{
    name: string;
    sku: string;
    category: string;
    quantity: number;
  }>;
  bottomProductsByStock: Array<{
    name: string;
    sku: string;
    category: string;
    quantity: number;
  }>;
  recentOrderTrend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  categorySummary: Array<{
    category: string;
    products: number;
    totalQuantity: number;
    inventoryValue: number;
  }>;
}

export interface GenerateAIInsightsResponse {
  success: boolean;
  insights: AIInsights;
  stats: AIInsightsStats;
  fallback: boolean;
  cached: boolean;
  generatedAt: string;
}

export const generateInsights = () =>
  client.post<GenerateAIInsightsResponse>('/ai/insights').then((r) => r.data);
