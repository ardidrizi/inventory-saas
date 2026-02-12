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

const sampleProduct = {
  name: 'Test Widget',
  sku: 'TW-001',
  description: 'A test product',
  price: 29.99,
  quantity: 100,
  category: 'Electronics',
};

describe('Products API', () => {
  beforeEach(async () => {
    adminToken = await registerAdmin();
  });

  describe('POST /api/products', () => {
    it('should create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(sampleProduct.name);
      expect(res.body.sku).toBe(sampleProduct.sku);
      expect(res.body.price).toBe(sampleProduct.price);
    });

    it('should reject duplicate SKU', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      expect(res.status).toBe(500);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/products').send(sampleProduct);
      expect(res.status).toBe(401);
    });

    it('should reject manager role', async () => {
      const managerRes = await request(app).post('/api/auth/register').send({
        name: 'Manager',
        email: 'manager@test.com',
        password: 'password123',
        role: 'manager',
      });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${managerRes.body.token}`)
        .send(sampleProduct);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleProduct, name: 'Another Widget', sku: 'TW-002' });
    });

    it('should list all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.totalPages).toBe(1);
    });

    it('should search products by name', async () => {
      const res = await request(app)
        .get('/api/products?search=Another')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Another Widget');
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/products?category=Electronics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/products?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.totalPages).toBe(2);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get a product by id', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const res = await request(app)
        .get(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(sampleProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const res = await request(app)
        .put(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Widget', price: 39.99 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Widget');
      expect(res.body.price).toBe(39.99);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should soft delete a product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const deleteRes = await request(app)
        .delete(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(204);

      // Should not appear in list
      const listRes = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.body.products).toHaveLength(0);
    });

    it('should return 404 for already deleted product', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      await request(app)
        .delete(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .delete(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
