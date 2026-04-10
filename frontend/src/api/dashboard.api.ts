import client from './client';
import { DashboardStats } from '../types';

type DashboardApiPayload = Partial<DashboardStats> & {
  products?: number;
  orders?: number;
  revenue?: number;
  lowStock?: number;
};

const defaultStats: DashboardStats = {
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  lowStockProducts: 0,
  lowStockThreshold: 10,
  lowStockProductList: [],
  topSellingProducts: [],
  userCount: 0,
  recentOrders: [],
  ordersByStatus: {},
  revenueOverTime: [],
};

const normalizeStats = (payload: DashboardApiPayload | undefined): DashboardStats => ({
  ...defaultStats,
  totalProducts: payload?.totalProducts ?? payload?.products ?? 0,
  totalOrders: payload?.totalOrders ?? payload?.orders ?? 0,
  totalRevenue: payload?.totalRevenue ?? payload?.revenue ?? 0,
  lowStockProducts: payload?.lowStockProducts ?? payload?.lowStock ?? 0,
  lowStockThreshold: payload?.lowStockThreshold ?? 10,
  lowStockProductList: Array.isArray(payload?.lowStockProductList) ? payload.lowStockProductList : [],
  topSellingProducts: Array.isArray(payload?.topSellingProducts) ? payload.topSellingProducts : [],
  userCount: payload?.userCount ?? 0,
  recentOrders: payload?.recentOrders ?? [],
  ordersByStatus: payload?.ordersByStatus ?? {},
  revenueOverTime: payload?.revenueOverTime ?? [],
});

export const getStats = () =>
  client.get<DashboardApiPayload | { data?: DashboardApiPayload }>('/dashboard').then((r) => {
    const raw = (r.data as { data?: DashboardApiPayload })?.data ?? (r.data as DashboardApiPayload);
    return normalizeStats(raw);
  });
