import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import * as aiApi from '../api/ai.api';
import { useAuth } from '../context/AuthContext';

const pageCard = 'rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const normalizeInsightErrorMessage = (message?: string) => {
  if (!message) return 'Failed to generate AI insights';

  const lower = message.toLowerCase();
  if (lower.includes('insufficient_quota') || lower.includes('quota exceeded')) {
    return 'OpenAI API quota exceeded. Check API billing or usage limits.';
  }

  return message;
};

const AIInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<aiApi.GenerateAIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const statCards = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Total Products', value: String(data.stats.totals.products), tone: 'text-sky-600' },
      { label: 'Low Stock', value: String(data.stats.totals.lowStockProducts), tone: 'text-amber-600' },
      { label: 'Out of Stock', value: String(data.stats.totals.outOfStockProducts), tone: 'text-rose-600' },
      { label: 'Total Orders', value: String(data.stats.totals.orders), tone: 'text-violet-600' },
      { label: 'Total Revenue', value: formatCurrency(data.stats.totals.revenue), tone: 'text-emerald-600' },
    ];
  }, [data]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await aiApi.generateInsights();
      setData(payload);
      toast.success('AI insights generated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message = normalizeInsightErrorMessage(axiosErr.response?.data?.message);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={pageCard}>
        <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 AI Insights</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This page is available only to admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 AI Insights</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Generate an AI-driven snapshot of inventory health, risks, and recommended next actions.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {loading ? 'Generating Insights…' : 'Generate Insights'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className={pageCard}>
          <h2 className="mb-1 text-base font-semibold text-gray-800 dark:text-gray-100">No insights generated yet</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Click <span className="font-semibold">Generate Insights</span> to analyze current products and orders.
          </p>
        </div>
      )}

      {loading && (
        <div className={pageCard}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Building your business summary from recent inventory and order data…
          </p>
        </div>
      )}

      {data && (
        <>
          {data.fallback && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
              AI-generated insights are temporarily unavailable. Showing locally generated insights instead.
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className={`mt-2 text-xl font-bold ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </section>

          <section className={pageCard}>
            <h2 className="mb-2 text-base font-semibold text-gray-800 dark:text-gray-100">Executive Summary</h2>
            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-900/60 dark:text-gray-200">
              {data.insights.summary}
            </p>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className={pageCard}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Risks
              </h3>
              {data.insights.risks.length === 0 ? (
                <p className="text-sm text-gray-500">No notable risks found.</p>
              ) : (
                <ul className="space-y-2">
                  {data.insights.risks.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={pageCard}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Opportunities
              </h3>
              {data.insights.opportunities.length === 0 ? (
                <p className="text-sm text-gray-500">No clear opportunities detected.</p>
              ) : (
                <ul className="space-y-2">
                  {data.insights.opportunities.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={pageCard}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Actions
              </h3>
              {data.insights.actions.length === 0 ? (
                <p className="text-sm text-gray-500">No actions generated.</p>
              ) : (
                <ol className="space-y-2">
                  {data.insights.actions.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
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
