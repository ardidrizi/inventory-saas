import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import '../__tests__/setup';

const createAdmin = async () => {
  const user = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
  return {
    user,
    token: jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' }),
  };
};

const createManager = async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Manager',
    email: 'manager@test.com',
    password: 'password123',
  });
  return { user: res.body.user, token: res.body.token };
};

describe('Users API', () => {
  let admin: { user: { _id: string }; token: string };
  let manager: { user: { _id: string }; token: string };

  beforeEach(async () => {
    admin = await createAdmin();
    manager = await createManager();
  });

  describe('GET /api/users', () => {
    it('should list all users as admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].password).toBeUndefined();
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${manager.token}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('should change user role to admin', async () => {
      const res = await request(app)
        .patch(`/api/users/${manager.user._id}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('should change user role to manager', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin.user._id}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'manager' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('manager');
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .patch(`/api/users/${manager.user._id}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin.user._id}/role`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ role: 'manager' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/status', () => {
    it('should deactivate a user', async () => {
      const res = await request(app)
        .patch(`/api/users/${manager.user._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it('should reactivate a user', async () => {
      await request(app)
        .patch(`/api/users/${manager.user._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: false });

      const res = await request(app)
        .patch(`/api/users/${manager.user._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(true);
    });

    it('should prevent admin from deactivating themselves', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin.user._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/your own/i);
    });

    it('should block deactivated user from logging in', async () => {
      await request(app)
        .patch(`/api/users/${manager.user._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ isActive: false });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'manager@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin.user._id}/status`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });
  });
});
