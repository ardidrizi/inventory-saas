import { Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { AuthRequest } from '../middleware/auth';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.create(req.body, req.userId!);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const findAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.findAll({
      status: req.query.status as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const findById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.findById(req.params.id as string);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.updateStatus(req.params.id as string, req.body.status);
    res.json(order);
  } catch (error) {
    next(error);
  }
};
