export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  quantity: number;
  lowStockThreshold?: number;
  category: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  customer: { name: string; email: string };
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLowStockProduct {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  category: string;
  price: number;
}

export interface DashboardTopSellingProduct {
  _id: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockProducts: number;
  lowStockThreshold: number;
  lowStockProductList: DashboardLowStockProduct[];
  topSellingProducts: DashboardTopSellingProduct[];
  userCount: number;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  revenueOverTime: { _id: string; revenue: number; orders: number }[];
}

export interface AuthResponse {
  user: User;
  token: string;
}
