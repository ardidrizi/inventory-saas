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

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!stats) return <div>Failed to load dashboard</div>;

  const statCards = [
    { label: 'Products', value: stats.totalProducts, color: '#2196f3' },
    { label: 'Orders', value: stats.totalOrders, color: '#4caf50' },
    { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, color: '#ff9800' },
    { label: 'Low Stock', value: stats.lowStockProducts, color: '#e91e63' },
  ];

  const statusData = Object.entries(stats.ordersByStatus).map(([name, value]) => ({
    name,
    value,
  }));

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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2196f3" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
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
            {stats.recentOrders.map((order) => (
              <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{order.orderNumber}</td>
                <td style={{ padding: 10 }}>{order.customer.name}</td>
                <td style={{ padding: 10 }}>${order.totalAmount.toLocaleString()}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
