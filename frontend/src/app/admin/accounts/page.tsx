'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Account {
  _id: string;
  accountNumber: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  status: string;
  customerId?: { firstName: string; lastName: string; phoneNumber: string };
}

export default function AccountsPage() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!admin) return;
    api
      .get<{ success: boolean; accounts: Account[] }>('/api/admin/accounts')
      .then((res) => setAccounts(res.accounts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Installment Accounts</h1>
          <p className="text-sm text-gray-500">{accounts.length} accounts</p>
        </div>
        <Link href="/admin/accounts/new" className="btn-primary text-sm">
          + New Account
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Account #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((a) => (
              <tr key={a._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{a.accountNumber}</td>
                <td className="px-4 py-3">
                  {a.customerId
                    ? `${a.customerId.firstName} ${a.customerId.lastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {currency} {a.totalAmount.toLocaleString('en-PK')}
                </td>
                <td className="px-4 py-3 font-medium">
                  {currency} {a.remainingAmount.toLocaleString('en-PK')}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No accounts yet.{' '}
                  <Link href="/admin/accounts/new" className="underline" style={{ color: 'var(--color-primary)' }}>
                    Create one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
