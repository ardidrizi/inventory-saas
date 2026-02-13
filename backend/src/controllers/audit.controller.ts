import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import AuditLog from '../models/AuditLog';

export const findAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, entityType, page = '1', limit = '20' } = req.query;
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    next(error);
  }
};
