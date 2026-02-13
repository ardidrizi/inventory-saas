import React, { useState, useEffect, useCallback } from 'react';
import * as auditApi from '../api/audit.api';
import type { AuditLogEntry } from '../api/audit.api';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'UPDATE_ROLE',
  'ACTIVATE',
  'DEACTIVATE',
  'UPDATE_STATUS',
];

const actionColor: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  UPDATE_ROLE: 'bg-orange-100 text-orange-700',
  ACTIVATE: 'bg-emerald-100 text-emerald-700',
  DEACTIVATE: 'bg-rose-100 text-rose-700',
  UPDATE_STATUS: 'bg-purple-100 text-purple-700',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ENTITY_TYPES = ['User', 'Product', 'Order'];

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        page,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="m-0 text-2xl font-bold text-gray-800">
          📋 Audit Logs{' '}
          <span className="text-lg font-normal text-gray-500">({total})</span>
        </h1>
        <div className="flex gap-3">
          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50 text-sm text-gray-600">
                <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold">User</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Entity Type</th>
                <th className="px-4 py-3 text-left font-semibold">Entity ID</th>
                <th className="px-4 py-3 text-left font-semibold">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {log.user?.name ?? <span className="italic text-gray-400">Deleted user</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${actionColor[log.action] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="font-medium">{log.entityType}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className="font-mono text-xs" title={log.entityId}>
                      {log.entityId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.metadata
                      ? Object.entries(log.metadata)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-4 py-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="cursor-pointer rounded border border-gray-300 px-4 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="cursor-pointer rounded border border-gray-300 px-4 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
