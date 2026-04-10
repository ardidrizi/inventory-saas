import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as dashboardApi from '../api/dashboard.api';
import { DashboardStats } from '../types';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'];

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

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((data) =>
        setStats({
          ...defaultStats,
          ...(data ?? {}),
          lowStockProductList: Array.isArray(data?.lowStockProductList) ? data.lowStockProductList : [],
          topSellingProducts: Array.isArray(data?.topSellingProducts) ? data.topSellingProducts : [],
          recentOrders: Array.isArray(data?.recentOrders) ? data.recentOrders : [],
          ordersByStatus:
            data?.ordersByStatus && typeof data.ordersByStatus === 'object'
              ? data.ordersByStatus
              : {},
          revenueOverTime: Array.isArray(data?.revenueOverTime) ? data.revenueOverTime : [],
        }),
      )
      .catch(() => {
        setError('Failed to load dashboard data. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) {
    return (
      <div
        style={{
          background: '#ffe0e0',
          color: '#c00',
          padding: 12,
          borderRadius: 6,
        }}
      >
        {error}
      </div>
    );
  }
  const statCards = [
    { label: 'Products', value: stats.totalProducts ?? 0, color: '#2196f3' },
    { label: 'Orders', value: stats.totalOrders ?? 0, color: '#4caf50' },
    { label: 'Revenue', value: `$${(stats.totalRevenue ?? 0).toLocaleString()}`, color: '#ff9800' },
    { label: 'Low Stock', value: stats.lowStockProducts ?? 0, color: '#e91e63' },
  ];

  const statusData = Object.entries(stats.ordersByStatus ?? {}).map(([name, value]) => ({
    name,
    value: value ?? 0,
  }));
  const revenueData = Array.isArray(stats.revenueOverTime) ? stats.revenueOverTime : [];
  const recentOrders = Array.isArray(stats.recentOrders) ? stats.recentOrders : [];
  const lowStockProducts = Array.isArray(stats.lowStockProductList) ? stats.lowStockProductList : [];
  const topSellingProducts = Array.isArray(stats.topSellingProducts) ? stats.topSellingProducts : [];

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 30,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Revenue (Last 30 Days)</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2196f3" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#999' }}>No revenue data available</div>
          )}
        </div>
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Orders by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#999' }}>No order status data available</div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Low-Stock Alerts (≤ {stats.lowStockThreshold ?? 10})</h3>
          {lowStockProducts.length === 0 ? (
            <div style={{ color: '#999' }}>No low-stock products right now.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Product</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>SKU</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{product.name || '-'}</td>
                    <td style={{ padding: 8 }}>{product.sku || '-'}</td>
                    <td style={{ padding: 8, fontWeight: 700, color: '#c62828' }}>{product.quantity ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Top-Selling Products</h3>
          {topSellingProducts.length === 0 ? (
            <div style={{ color: '#999' }}>No sales data available yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Product</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Units Sold</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts.map((product) => (
                  <tr key={product._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{product.productName || '-'}</td>
                    <td style={{ padding: 8 }}>{product.totalQuantitySold ?? 0}</td>
                    <td style={{ padding: 8 }}>${(product.totalRevenue ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Order #</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Customer</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Amount</th>
              <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{order.orderNumber || '-'}</td>
                <td style={{ padding: 10 }}>{order.customer?.name || '-'}</td>
                <td style={{ padding: 10 }}>${(order.totalAmount ?? 0).toLocaleString()}</td>
                <td style={{ padding: 10 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      background:
                        order.status === 'delivered'
                          ? '#e8f5e9'
                          : order.status === 'cancelled'
                            ? '#ffebee'
                            : '#e3f2fd',
                      color:
                        order.status === 'delivered'
                          ? '#2e7d32'
                          : order.status === 'cancelled'
                            ? '#c62828'
                            : '#1565c0',
                    }}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: '#999', textAlign: 'center' }}>
                  No recent orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
