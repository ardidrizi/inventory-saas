import { Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { AuthRequest } from '../middleware/auth';
import { logAction } from '../services/audit.service';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.create(req.body, req.userId!);
    await logAction({ userId: req.userId!, action: 'CREATE', entityType: 'Order', entityId: order._id, metadata: { orderNumber: order.orderNumber } });
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

export const exportOrdersCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const csv = await orderService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.updateStatus(req.params.id as string, req.body.status);
    await logAction({ userId: req.userId!, action: 'UPDATE_STATUS', entityType: 'Order', entityId: order._id, metadata: { status: order.status } });
    res.json(order);
  } catch (error) {
    next(error);
  }
};
