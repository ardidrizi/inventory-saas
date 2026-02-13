import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  user: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

auditLogSchema.index({ user: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
