'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Summary {
  days: number;
  overview: { pageviews: number; sessions: number; visits: number };
  daily: { date: string; pageviews: number; sessions: number }[];
  pages: { path: string; pageviews: number; sessions: number }[];
  ctas: { action: string; label?: string; clicks: number }[];
  geo: { city?: string; region?: string; country?: string; visits: number }[];
  devices: { device: string; sessions: number; pageviews: number }[];
}

export default function TrafficReportPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.get<Summary & { success: boolean }>(`/api/admin/analytics/summary?days=${days}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Unable to load traffic analytics.'));
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Website analytics</p>
          <h1 className="text-2xl font-bold">Traffic & Engagement</h1>
          <p className="mt-1 text-sm text-gray-500">Consent-based storefront traffic. Bot traffic is excluded.</p>
        </div>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Visits', data?.overview.visits ?? 0],
          ['Sessions', data?.overview.sessions ?? 0],
          ['Pageviews', data?.overview.pageviews ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="card p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Daily traffic</h2>
          <div className="mt-4 space-y-2 text-sm">
            {data?.daily.map((row) => (
              <div key={row.date} className="flex justify-between border-b border-gray-100 py-2">
                <span>{row.date}</span><span>{row.sessions} sessions · {row.pageviews} pageviews</span>
              </div>
            ))}
            {!data && <p className="text-gray-500">Loading…</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Top pages</h2>
          <div className="mt-4 space-y-2 text-sm">
            {data?.pages.map((row) => (
              <div key={row.path} className="flex justify-between gap-4 border-b border-gray-100 py-2">
                <span className="truncate">{row.path}</span><span className="shrink-0">{row.pageviews}</span>
              </div>
            ))}
            {!data && <p className="text-gray-500">Loading…</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">CTA activity</h2>
          <div className="mt-4 space-y-2 text-sm">
            {data?.ctas.map((row) => (
              <div key={`${row.action}-${row.label || ''}`} className="flex justify-between gap-4 border-b border-gray-100 py-2">
                <span className="truncate">{row.label || row.action}</span><span className="shrink-0">{row.clicks}</span>
              </div>
            ))}
            {!data && <p className="text-gray-500">Loading…</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Locations</h2>
          <div className="mt-4 space-y-2 text-sm">
            {data?.geo.map((row, index) => (
              <div key={`${row.city || ''}-${row.region || ''}-${row.country || ''}-${index}`} className="flex justify-between gap-4 border-b border-gray-100 py-2">
                <span>{[row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown'}</span><span>{row.visits}</span>
              </div>
            ))}
            {!data && <p className="text-gray-500">Loading…</p>}
            {data?.geo.length === 0 && <p className="text-gray-500">Geographic data is unavailable until a trusted geo provider is configured.</p>}
          </div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Devices</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {data?.devices.map((row) => (
              <div key={row.device} className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <span className="font-medium capitalize">{row.device}</span> · {row.sessions} sessions · {row.pageviews} pageviews
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
