import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import '../__tests__/setup';

let adminToken: string;

const registerAdmin = async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  return res.body.token;
};

describe('Dashboard API', () => {
  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  it('should return dashboard stats with empty data', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalProducts).toBe(0);
    expect(res.body.totalOrders).toBe(0);
    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.lowStockProducts).toBe(0);
    expect(res.body.userCount).toBe(1);
    expect(res.body.recentOrders).toEqual([]);
    expect(res.body.ordersByStatus).toEqual({});
    expect(res.body.revenueOverTime).toEqual([]);
  });

  it('should return correct stats after creating data', async () => {
    // Create product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dashboard Widget',
        sku: 'DW-001',
        price: 100,
        quantity: 5, // low stock
        category: 'Test',
      });

    // Create order
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ product: productRes.body._id, quantity: 2 }],
        customer: { name: 'Test', email: 'test@example.com' },
      });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalProducts).toBe(1);
    expect(res.body.totalOrders).toBe(1);
    expect(res.body.totalRevenue).toBe(200);
    expect(res.body.lowStockProducts).toBe(1);
    expect(res.body.recentOrders).toHaveLength(1);
    expect(res.body.ordersByStatus).toHaveProperty('pending', 1);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });
});
