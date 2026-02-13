import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as userService from '../services/user.service';
import { logAction } from '../services/audit.service';

export const findAll = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateRole(req.params.id as string, req.body.role);
    await logAction({ userId: req.userId!, action: 'UPDATE_ROLE', entityType: 'User', entityId: user._id, metadata: { role: user.role } });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateStatus(req.params.id as string, req.body.isActive, req.userId!);
    await logAction({ userId: req.userId!, action: user.isActive ? 'ACTIVATE' : 'DEACTIVATE', entityType: 'User', entityId: user._id });
    res.json(user);
  } catch (error) {
    next(error);
  }
};
