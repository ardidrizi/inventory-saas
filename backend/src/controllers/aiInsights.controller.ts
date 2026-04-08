import { Request, Response, NextFunction } from 'express';
import * as aiInsightsService from '../services/aiInsights.service';

export const createInsights = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = await aiInsightsService.generateInsights();
    res.json(payload);
  } catch (error) {
    next(error);
  }
};
