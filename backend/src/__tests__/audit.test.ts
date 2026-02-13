import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import '../__tests__/setup';

let adminToken: string;
let adminId: string;

const createAdmin = async () => {
  const user = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  adminId = user._id.toString();
  return jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
};

const createManager = async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Manager',
    email: 'manager@test.com',
    password: 'password123',
  });
  return res.body;
};

const sampleProduct = {
  name: 'Audit Widget',
  sku: 'AW-001',
  description: 'Audit test product',
  price: 25,
  quantity: 50,
  category: 'Test',
};

describe('Audit Logging', () => {
  beforeEach(async () => {
    adminToken = await createAdmin();
  });

  describe('User actions', () => {
    it('should log role change', async () => {
      const { user: manager } = await createManager();

      await request(app)
        .patch(`/api/users/${manager._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      const logs = await AuditLog.find({ entityType: 'User', action: 'UPDATE_ROLE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].user.toString()).toBe(adminId);
      expect(logs[0].entityId.toString()).toBe(manager._id);
      expect(logs[0].metadata?.role).toBe('admin');
    });

    it('should log user deactivation', async () => {
      const { user: manager } = await createManager();

      await request(app)
        .patch(`/api/users/${manager._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      const logs = await AuditLog.find({ entityType: 'User', action: 'DEACTIVATE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(manager._id);
    });

    it('should log user activation', async () => {
      const { user: manager } = await createManager();

      await request(app)
        .patch(`/api/users/${manager._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      await request(app)
        .patch(`/api/users/${manager._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      const logs = await AuditLog.find({ entityType: 'User', action: 'ACTIVATE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(manager._id);
    });
  });

  describe('Product actions', () => {
    it('should log product creation', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const logs = await AuditLog.find({ entityType: 'Product', action: 'CREATE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(res.body._id);
      expect(logs[0].metadata?.name).toBe('Audit Widget');
    });

    it('should log product update', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      await request(app)
        .put(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 30 });

      const logs = await AuditLog.find({ entityType: 'Product', action: 'UPDATE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(createRes.body._id);
    });

    it('should log product deletion', async () => {
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      await request(app)
        .delete(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const logs = await AuditLog.find({ entityType: 'Product', action: 'DELETE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(createRes.body._id);
    });
  });

  describe('Order actions', () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);
      productId = res.body._id;
    });

    it('should log order creation', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 2 }],
          customer: { name: 'John', email: 'john@test.com' },
        });

      const logs = await AuditLog.find({ entityType: 'Order', action: 'CREATE' });
      expect(logs).toHaveLength(1);
      expect(logs[0].entityId.toString()).toBe(res.body._id);
      expect(logs[0].metadata?.orderNumber).toMatch(/^ORD-/);
    });

    it('should log order status update', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          customer: { name: 'Jane', email: 'jane@test.com' },
        });

      await request(app)
        .patch(`/api/orders/${createRes.body._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      const logs = await AuditLog.find({ entityType: 'Order', action: 'UPDATE_STATUS' });
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata?.status).toBe('confirmed');
    });
  });

  describe('GET /api/audit endpoint', () => {
    it('should return audit logs with pagination', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.logs[0].action).toBe('CREATE');
      expect(res.body.logs[0].user).toHaveProperty('name');
    });

    it('should filter by action', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleProduct, sku: 'AW-002' });

      await request(app)
        .put(`/api/products/${createRes.body._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 99 });

      const res = await request(app)
        .get('/api/audit?action=UPDATE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].action).toBe('UPDATE');
    });

    it('should filter by entityType', async () => {
      const { user: manager } = await createManager();

      await request(app)
        .patch(`/api/users/${manager._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      const res = await request(app)
        .get('/api/audit?entityType=User')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs.every((l: { entityType: string }) => l.entityType === 'User')).toBe(true);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...sampleProduct, sku: `AW-${i}` });
      }

      const res = await request(app)
        .get('/api/audit?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.totalPages).toBe(2);
    });

    it('should reject non-admin users', async () => {
      const { token } = await createManager();

      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/audit');
      expect(res.status).toBe(401);
    });
  });
});
