import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import '../__tests__/setup';
import User from '../models/User';
import Product from '../models/Product';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let adminToken: string;

const createAdmin = async () => {
  const user = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  return jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Dashboard API', () => {
  beforeEach(async () => {
    adminToken = await createAdmin();
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
    expect(res.body.lowStockThreshold).toBe(10);
    expect(res.body.lowStockProductList).toEqual([]);
    expect(res.body.topSellingProducts).toEqual([]);
    expect(res.body.userCount).toBe(1);
    expect(res.body.recentOrders).toEqual([]);
    expect(res.body.ordersByStatus).toEqual({});
    expect(res.body.revenueOverTime).toEqual([]);
  });

  it('should return low stock list and top-selling products', async () => {
    const lowStockProductRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dashboard Widget',
        sku: 'DW-001',
        price: 100,
        quantity: 5,
        category: 'Test',
      });

    const topSellerProductRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fast Mover',
        sku: 'FM-001',
        price: 25,
        quantity: 50,
        category: 'Test',
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Out Product',
        sku: 'OOS-001',
        price: 30,
        quantity: 0,
        category: 'Test',
      });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { product: lowStockProductRes.body._id, quantity: 2 },
          { product: topSellerProductRes.body._id, quantity: 7 },
        ],
        customer: { name: 'Test', email: 'test@example.com' },
      });


    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalProducts).toBe(3);
    expect(res.body.totalOrders).toBe(1);
    expect(res.body.totalRevenue).toBe(375);
    expect(res.body.lowStockProducts).toBe(2);
    expect(res.body.lowStockProductList).toHaveLength(2);
    expect(res.body.lowStockProductList[0]).toMatchObject({
      name: 'Out Product',
      sku: 'OOS-001',
      quantity: 0,
    });
    expect(res.body.lowStockProductList[1]).toMatchObject({
      name: 'Dashboard Widget',
      sku: 'DW-001',
      quantity: 3,
    });
    expect(res.body.topSellingProducts).toHaveLength(2);
    expect(res.body.topSellingProducts[0]).toMatchObject({
      productName: 'Fast Mover',
      totalQuantitySold: 7,
      totalRevenue: 175,
    });
    expect(res.body.topSellingProducts[1]).toMatchObject({
      productName: 'Dashboard Widget',
      totalQuantitySold: 2,
      totalRevenue: 200,
    });
    expect(res.body.recentOrders).toHaveLength(1);
    expect(res.body.ordersByStatus).toHaveProperty('pending', 1);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('should normalize legacy stock field into quantity for dashboard responses', async () => {
    await Product.collection.insertOne({
      name: 'Legacy Stock Item',
      sku: 'LEG-001',
      price: 12,
      stock: 3,
      category: 'Legacy',
      isDeleted: false,
      lowStockThreshold: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.lowStockProducts).toBe(1);
    expect(res.body.lowStockProductList).toHaveLength(1);
    expect(res.body.lowStockProductList[0]).toMatchObject({
      name: 'Legacy Stock Item',
      sku: 'LEG-001',
      quantity: 3,
    });
  });
});
