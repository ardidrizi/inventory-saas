import React, { useState } from 'react';
import toast from 'react-hot-toast';
import * as aiApi from '../api/ai.api';
import { useAuth } from '../context/AuthContext';

const card = 'rounded-lg bg-white p-5 shadow-sm dark:bg-gray-800';

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const AIInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<aiApi.GenerateAIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await aiApi.generateInsights();
      setData(payload);
      toast.success('AI insights generated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message = axiosErr.response?.data?.message || 'Failed to generate AI insights';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={card}>
        <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 AI Insights</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This page is available only to admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 AI Insights</h1>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate Insights'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className={card}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Click <span className="font-semibold">Generate Insights</span> to create a fresh AI summary from your current inventory and orders.
          </p>
        </div>
      )}

      {loading && (
        <div className={card}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Generating insights from current business data…</p>
        </div>
      )}

      {data && (
        <>
          <section className={card}>
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Stats Snapshot</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded border border-gray-100 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Products</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{data.stats.totals.products}</p>
              </div>
              <div className="rounded border border-gray-100 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Low Stock</p>
                <p className="text-lg font-semibold text-amber-600">{data.stats.totals.lowStockProducts}</p>
              </div>
              <div className="rounded border border-gray-100 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Out of Stock</p>
                <p className="text-lg font-semibold text-rose-600">{data.stats.totals.outOfStockProducts}</p>
              </div>
              <div className="rounded border border-gray-100 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Orders</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{data.stats.totals.orders}</p>
              </div>
              <div className="rounded border border-gray-100 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(data.stats.totals.revenue)}</p>
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">Summary</h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">{data.insights.summary}</p>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className={card}>
              <h3 className="mb-2 text-base font-semibold text-rose-700 dark:text-rose-300">Risks</h3>
              {data.insights.risks.length === 0 ? (
                <p className="text-sm text-gray-500">No risks identified.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
                  {data.insights.risks.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className={card}>
              <h3 className="mb-2 text-base font-semibold text-blue-700 dark:text-blue-300">Opportunities</h3>
              {data.insights.opportunities.length === 0 ? (
                <p className="text-sm text-gray-500">No opportunities identified.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
                  {data.insights.opportunities.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className={card}>
              <h3 className="mb-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">Actions</h3>
              {data.insights.actions.length === 0 ? (
                <p className="text-sm text-gray-500">No actions generated.</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
                  {data.insights.actions.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AIInsightsPage;
