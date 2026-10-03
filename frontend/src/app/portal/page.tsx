'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Account {
  _id: string;
  accountNumber: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  downPayment: number;
}

interface Due {
  accountId: string;
  installmentNumber: number;
  dueDate: string;
  remaining: number;
  status: string;
}

export default function PortalHome() {
  const { customer } = useCustomerAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    Promise.all([
      api.get<{ success: boolean; accounts: Account[] }>('/api/customer/accounts'),
      api.get<{ success: boolean; dues: Due[] }>('/api/customer/dues'),
    ])
      .then(([a, d]) => {
        setAccounts(a.accounts);
        setDues(d.dues);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customer]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Accounts</h1>
        <p className="text-sm text-gray-500">Installment accounts & upcoming dues</p>
      </div>

      {dues.filter((d) => d.status === 'overdue').length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">Overdue payments</h2>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {dues
              .filter((d) => d.status === 'overdue')
              .map((d, i) => (
                <li key={i}>
                  Installment #{d.installmentNumber} — {currency}{' '}
                  {d.remaining.toLocaleString('en-PK')} (due{' '}
                  {new Date(d.dueDate).toLocaleDateString('en-GB')})
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <Link key={a._id} href={`/portal/accounts/${a._id}`} className="card block hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500">{a.accountNumber}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {a.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Remaining</p>
            <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {currency} {a.remainingAmount.toLocaleString('en-PK')}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Total {currency} {a.totalAmount.toLocaleString('en-PK')}
            </p>
          </Link>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-gray-500 col-span-2">No installment accounts yet.</p>
        )}
      </div>

      {dues.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Upcoming dues</h2>
          <ul className="divide-y text-sm">
            {dues.slice(0, 10).map((d, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>
                  #{d.installmentNumber}{' '}
                  <span className="text-gray-400">
                    {new Date(d.dueDate).toLocaleDateString('en-GB')}
                  </span>
                  {d.status === 'overdue' && (
                    <span className="ml-2 text-xs font-medium text-red-600">OVERDUE</span>
                  )}
                </span>
                <span className="font-medium">
                  {currency} {d.remaining.toLocaleString('en-PK')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
