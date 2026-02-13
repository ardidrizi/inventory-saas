import client from './client';

export interface AuditLogEntry {
  _id: string;
  user: { _id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export const getAuditLogs = (params?: { action?: string; entityType?: string; page?: number; limit?: number }) =>
  client.get<AuditLogResponse>('/audit', { params }).then((r) => r.data);
