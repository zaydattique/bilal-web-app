'use client';

import { useEffect, useState } from 'react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Payment {
  _id: string;
  paymentAmount: number;
  paymentMethod: string;
  receiptNumber: string;
  paymentDate: string;
  accountId?: { accountNumber: string };
}

export default function PortalPayments() {
  const { token } = useCustomerAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ success: boolean; payments: Payment[] }>('/api/customer/payments', token)
      .then((res) => setPayments(res.payments))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment History</h1>
        <p className="text-sm text-gray-500">{payments.length} payments</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
