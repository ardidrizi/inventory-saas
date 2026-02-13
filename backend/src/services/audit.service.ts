import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';

interface LogActionParams {
  userId: Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}

export const logAction = async (params: LogActionParams): Promise<void> => {
  try {
    await AuditLog.create({
      user: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};
