import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import '../__tests__/setup';

let adminToken: string;
let productId: string;

const registerAdmin = async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  return res.body.token;
};

const createProduct = async (token: string, overrides = {}) => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Order Test Product',
      sku: 'OTP-001',
      price: 50,
      quantity: 20,
      category: 'Test',
      ...overrides,
    });
  return res.body._id;
};

describe('Orders API', () => {
  beforeEach(async () => {
    adminToken = await registerAdmin();
    productId = await createProduct(adminToken);
  });

  describe('POST /api/orders', () => {
    it('should create an order and reduce stock', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 3 }],
          customer: { name: 'John Doe', email: 'john@example.com' },
        });

      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toMatch(/^ORD-/);
      expect(res.body.totalAmount).toBe(150);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.status).toBe('pending');

      // Verify stock was reduced
      const productRes = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(productRes.body.quantity).toBe(17);
    });

    it('should reject order with insufficient stock', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 999 }],
          customer: { name: 'John', email: 'john@example.com' },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient stock/i);
    });

    it('should reject order with non-existent product', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: '507f1f77bcf86cd799439011', quantity: 1 }],
          customer: { name: 'John', email: 'john@example.com' },
        });

      expect(res.status).toBe(404);
    });

    it('should handle multi-item orders', async () => {
      const product2Id = await createProduct(adminToken, {
        name: 'Second Product',
        sku: 'OTP-002',
        price: 25,
        quantity: 10,
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { product: productId, quantity: 2 },
            { product: product2Id, quantity: 3 },
          ],
          customer: { name: 'Jane', email: 'jane@example.com' },
        });

      expect(res.status).toBe(201);
      expect(res.body.totalAmount).toBe(175); // (50*2) + (25*3)
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          customer: { name: 'Customer 1', email: 'c1@example.com' },
        });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 2 }],
          customer: { name: 'Customer 2', email: 'c2@example.com' },
        });
    });

    it('should list all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.totalPages).toBe(2);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          customer: { name: 'John', email: 'john@example.com' },
        });

      const res = await request(app)
        .patch(`/api/orders/${createRes.body._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
    });

    it('should reject invalid status', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          customer: { name: 'John', email: 'john@example.com' },
        });

      const res = await request(app)
        .patch(`/api/orders/${createRes.body._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
    });
  });
});
