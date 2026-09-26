'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Payment {
  _id: string;
  paymentAmount: number;
  paymentMethod: string;
  receiptNumber: string;
  paymentDate: string;
  status: string;
  customerId?: { firstName: string; lastName: string };
  accountId?: { accountNumber: string };
}

export default function PaymentsPage() {
  const { token } = useAuth();
  const { business } = useTheme();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!token) return;
    api
      .get<{ success: boolean; payments: Payment[] }>('/api/admin/payments', token)
      .then((res) => setPayments(res.payments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-gray-500">{payments.length} payments</p>
        </div>
        <Link href="/admin/payments/new" className="btn-primary text-sm">
          + Record Payment
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
                <td className="px-4 py-3">
                  {p.customerId
                    ? `${p.customerId.firstName} ${p.customerId.lastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{p.accountId?.accountNumber || '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {currency} {p.paymentAmount.toLocaleString('en-PK')}
                </td>
                <td className="px-4 py-3 capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No payments yet.{' '}
                  <Link href="/admin/payments/new" className="underline" style={{ color: 'var(--color-primary)' }}>
                    Record one
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
