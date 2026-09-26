'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

export default function DefaultsReport() {
  const { token } = useAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get<any>('/api/admin/reports/defaults', token)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  const bucketLabel = (id: number | string) => {
    if (id === 0) return '0–30 days';
    if (id === 30) return '30–60 days';
    if (id === 60) return '60–90 days';
    if (id === 90) return '90–180 days';
    if (id === 180) return '180+ days';
    return String(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">
          ← Reports
        </Link>
        <h1 className="text-2xl font-bold">Defaults / Aging</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.aging || []).map((b: any) => (
          <div key={String(b._id)} className="card">
            <p className="text-xs uppercase text-gray-500">{bucketLabel(b._id)}</p>
            <p className="text-xl font-bold">
              {currency} {(b.amount || 0).toLocaleString('en-PK')}
            </p>
            <p className="text-sm text-gray-500">{b.count} installments</p>
          </div>
        ))}
        {!(data?.aging || []).length && (
          <p className="text-sm text-gray-500">No overdue aging data.</p>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Defaulted accounts</h2>
        <ul className="divide-y text-sm">
          {(data?.defaultedAccounts || []).map((a: any) => (
            <li key={a._id} className="flex justify-between py-2">
              <span>
                {a.accountNumber}{' '}
                {a.customerId && (
                  <span className="text-gray-500">
                    — {a.customerId.firstName} {a.customerId.lastName}
                  </span>
                )}
              </span>
              <span className="font-medium">
                {currency} {(a.remainingAmount || 0).toLocaleString('en-PK')}
              </span>
            </li>
          ))}
          {!(data?.defaultedAccounts || []).length && (
            <li className="py-2 text-gray-500">No defaulted accounts.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
