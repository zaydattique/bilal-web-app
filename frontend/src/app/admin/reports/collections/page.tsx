'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

export default function CollectionsReport() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [days, setDays] = useState(30);
  const [trend, setTrend] = useState<{ date: string; total: number; count: number }[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    api
      .get<{ success: boolean; trend: typeof trend; totalCollected: number }>(
        `/api/admin/reports/collections?days=${days}`,
        token
      )
      .then((res) => {
        setTrend(res.trend);
        setTotalCollected(res.totalCollected);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, days]);

  const max = Math.max(...trend.map((t) => t.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">
            ← Reports
          </Link>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-gray-500">
            Last {days} days · {currency} {totalCollected.toLocaleString('en-PK')}
          </p>
        </div>
        <select
          className="input w-auto"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : trend.length === 0 ? (
        <p className="text-sm text-gray-500">No collections in this period.</p>
      ) : (
        <div className="card space-y-3">
          {trend.map((t) => (
            <div key={t.date} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-gray-500">{t.date}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-gray-100">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(t.total / max) * 100}%`,
                    background: 'var(--color-primary)',
                    minWidth: t.total > 0 ? '4px' : 0,
                  }}
                />
              </div>
              <span className="w-28 shrink-0 text-right font-medium">
                {currency} {t.total.toLocaleString('en-PK')}
              </span>
              <span className="w-12 shrink-0 text-right text-gray-400">{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
