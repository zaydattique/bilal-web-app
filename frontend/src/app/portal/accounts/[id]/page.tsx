'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

export default function PortalAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const { customer } = useCustomerAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    api
      .get<{ success: boolean; account: any }>(`/api/customer/accounts/${id}`)
      .then((res) => setAccount(res.account))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!account) return <p className="text-sm text-red-600">Account not found</p>;

  const plan = account.installmentPlanId;
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/portal" className="text-sm text-gray-500 hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold font-mono">{account.accountNumber}</h1>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {account.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold">
            {currency} {account.totalAmount.toLocaleString('en-PK')}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Down payment</p>
          <p className="text-lg font-bold">
            {currency} {(account.downPayment || 0).toLocaleString('en-PK')}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Remaining</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            {currency} {account.remainingAmount.toLocaleString('en-PK')}
          </p>
        </div>
      </div>

      {plan?.installments && (
        <div className="card overflow-x-auto p-0">
          <h2 className="border-b px-4 py-3 font-semibold">Payment schedule</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Due date</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {plan.installments.map((inst: any) => {
                const overdue =
                  inst.status !== 'paid' && new Date(inst.dueDate) < now;
                return (
                  <tr key={inst.installmentNumber}>
                    <td className="px-4 py-2">{inst.installmentNumber}</td>
                    <td className="px-4 py-2">
                      {new Date(inst.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-2">
                      {currency} {inst.dueAmount.toLocaleString('en-PK')}
                    </td>
                    <td className="px-4 py-2">
                      {currency} {(inst.paidAmount || 0).toLocaleString('en-PK')}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inst.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : overdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {overdue && inst.status !== 'paid' ? 'overdue' : inst.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
