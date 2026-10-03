'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import { Users, CreditCard, Package, Wallet, AlertTriangle } from 'lucide-react';

interface Summary {
  totalCustomers: number;
  activeAccounts: number;
  totalProducts: number;
  outstandingReceivable: number;
  collectionsThisMonth: number;
  collectionsToday: number;
  overdueInstallments: number;
}

export default function AdminDashboard() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!admin) return;
    api
      .get<{ success: boolean; summary: Summary; recentPayments: any[]; upcomingDues: any[] }>(
        '/api/admin/dashboard/summary',
        token
      )
      .then((res) => {
        setSummary(res.summary);
        setRecentPayments(res.recentPayments || []);
        setUpcoming(res.upcomingDues || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin]);

  const fmt = (n: number) =>
    `${currency} ${Number(n || 0).toLocaleString('en-PK')}`;

  if (loading) {
    return <div className="text-sm text-gray-500">Loading dashboard…</div>;
  }

  const cards = [
    { label: 'Customers', value: summary?.totalCustomers ?? 0, icon: Users, color: '#3498db' },
    { label: 'Active Accounts', value: summary?.activeAccounts ?? 0, icon: CreditCard, color: '#9b59b6' },
    { label: 'Products', value: summary?.totalProducts ?? 0, icon: Package, color: '#1abc9c' },
    { label: 'Outstanding', value: fmt(summary?.outstandingReceivable ?? 0), icon: Wallet, color: '#e67e22' },
    { label: 'Collected (Month)', value: fmt(summary?.collectionsThisMonth ?? 0), icon: Wallet, color: '#2ecc71' },
    { label: 'Overdue', value: summary?.overdueInstallments ?? 0, icon: AlertTriangle, color: '#e74c3c' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your installment business</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card flex items-center gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
                style={{ background: c.color }}
              >
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">{c.label}</p>
                <p className="text-xl font-semibold">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Recent Payments</h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {recentPayments.map((p) => (
                <li key={p._id} className="flex justify-between py-2 text-sm">
                  <span>
                    {p.customerId?.firstName} {p.customerId?.lastName}
                    <span className="ml-2 text-gray-400">{p.accountId?.accountNumber}</span>
                  </span>
                  <span className="font-medium">{fmt(p.paymentAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Upcoming Dues (7 days)</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming dues</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {upcoming.map((u, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span>
                    {u.customerName}
                    <span className="ml-2 text-gray-400">{u.accountNumber}</span>
                  </span>
                  <span className="font-medium">{fmt(u.dueAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
