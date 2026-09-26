'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

export default function CustomersReport() {
  const { token } = useAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get<any>('/api/admin/reports/customers', token)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">
          ← Reports
        </Link>
        <h1 className="text-2xl font-bold">Customer Report</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {(data?.byStatus || []).map((s: any) => (
          <span key={s._id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {s._id}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Top by outstanding due</h2>
          <ul className="divide-y text-sm">
            {(data?.topDueCustomers || []).map((c: any) => (
              <li key={c._id} className="flex justify-between py-2">
                <span>
                  {c.firstName} {c.lastName}
                  <span className="ml-2 text-xs text-gray-400">{c.phoneNumber}</span>
                </span>
                <span className="font-medium">
                  {currency} {(c.totalDue || 0).toLocaleString('en-PK')}
                </span>
              </li>
            ))}
            {!(data?.topDueCustomers || []).length && (
              <li className="py-2 text-gray-500">None</li>
            )}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Recent customers</h2>
          <ul className="divide-y text-sm">
            {(data?.recentCustomers || []).map((c: any) => (
              <li key={c._id} className="flex justify-between py-2">
                <span>
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-xs text-gray-400">{c.accountNumber}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
