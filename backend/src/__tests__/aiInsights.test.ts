import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import User from '../models/User';
import { env } from '../config/env';
import * as aiInsightsService from '../services/aiInsights.service';
import '../__tests__/setup';

const createAdminToken = async () => {
  const user = await User.create({
    name: 'Admin',
    email: 'admin-ai@test.com',
    password: 'password123',
    role: 'admin',
  });

  return jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
};

const createManagerToken = async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Manager',
    email: 'manager-ai@test.com',
    password: 'password123',
  });

  return res.body.token as string;
};

describe('AI Insights API', () => {
  let adminToken: string;
  let managerToken: string;

  beforeEach(async () => {
    adminToken = await createAdminToken();
    managerToken = await createManagerToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject unauthorized request', async () => {
    const res = await request(app).post('/api/ai/insights');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('should reject non-admin request', async () => {
    const res = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/insufficient permissions/i);
  });

  it('should return expected JSON shape for admin request', async () => {
    vi.spyOn(aiInsightsService, 'generateInsights').mockResolvedValue({
      success: true,
      insights: {
        summary: 'Inventory is stable with isolated low-stock risk.',
        risks: ['Two products are running low.'],
        opportunities: ['Seasonal category has room to grow.'],
        actions: ['Replenish low stock SKUs first.'],
      },
      stats: {
        totals: {
          products: 10,
          lowStockProducts: 2,
          outOfStockProducts: 1,
          orders: 24,
          revenue: 4100,
        },
        topProductsByStock: [],
        bottomProductsByStock: [],
        recentOrderTrend: [],
        categorySummary: [],
      },
      fallback: false,
      cached: false,
    });

    const res = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      insights: {
        summary: expect.any(String),
        risks: expect.any(Array),
        opportunities: expect.any(Array),
        actions: expect.any(Array),
      },
      stats: {
        totals: {
          products: expect.any(Number),
          lowStockProducts: expect.any(Number),
          outOfStockProducts: expect.any(Number),
          orders: expect.any(Number),
          revenue: expect.any(Number),
        },
        topProductsByStock: expect.any(Array),
        bottomProductsByStock: expect.any(Array),
        recentOrderTrend: expect.any(Array),
        categorySummary: expect.any(Array),
      },
      fallback: expect.any(Boolean),
      cached: expect.any(Boolean),
    });
  });

  it('should return safe error response when AI generation fails', async () => {
    vi.spyOn(aiInsightsService, 'generateInsights').mockRejectedValue(
      Object.assign(new Error('Failed to generate AI insights'), { statusCode: 502 }),
    );

    const res = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Failed to generate AI insights');
  });


  it('should return quota guidance for OpenAI quota errors', async () => {
    vi.spyOn(aiInsightsService, 'generateInsights').mockRejectedValue(
      Object.assign(new Error('OpenAI API quota exceeded. Check API billing or usage limits.'), {
        statusCode: 429,
      }),
    );

    const res = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(429);
    expect(res.body.message).toBe('OpenAI API quota exceeded. Check API billing or usage limits.');
  });

  it('should handle missing OPENAI_API_KEY correctly', async () => {
    vi.spyOn(aiInsightsService, 'generateInsights').mockRejectedValue(
      Object.assign(new Error('OPENAI_API_KEY is missing'), { statusCode: 500 }),
    );

    const res = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/OPENAI_API_KEY is missing/i);
  });
});
