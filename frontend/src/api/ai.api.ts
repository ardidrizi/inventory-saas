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
    _id: string;
    name: string;
    sku: string;
    category: string;
    quantity: number;
  }>;
  bottomProductsByStock: Array<{
    _id: string;
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
}

export const generateInsights = () =>
  client.post<GenerateAIInsightsResponse>('/ai/insights').then((r) => r.data);
