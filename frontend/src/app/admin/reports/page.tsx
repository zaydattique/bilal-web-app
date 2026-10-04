'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, TrendingUp, Users, Package, ListOrdered, ClipboardList, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

const cards = [
  { href: '/admin/reports/traffic', title: 'Website Traffic', desc: 'Visits, sessions, pageviews, locations and devices', icon: Activity },
  { href: '/admin/reports/due-list', title: 'Late / Due Installments', desc: 'Overdue and upcoming dues', icon: AlertTriangle },
  { href: '/admin/reports/collections', title: 'Collections', desc: 'Daily confirmed payment trend', icon: TrendingUp },
  { href: '/admin/reports/customers', title: 'Customers', desc: 'Statuses and outstanding balances', icon: Users },
  { href: '/admin/reports/products', title: 'Products', desc: 'Inventory and low-stock visibility', icon: Package },
  { href: '/admin/reports/defaults', title: 'Defaults / Aging', desc: 'Overdue balance aging', icon: ListOrdered },
];

export default function ReportsHub() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!admin) return;
    api.get<any>('/api/admin/dashboard/summary').then((r) => setSummary(r.summary)).catch(console.error);
  }, [admin]);

  const fmt = (n: number) => `${currency} ${Number(n || 0).toLocaleString('en-PK')}`;

  const kpis = [
    ['Customers', summary?.totalCustomers ?? 0],
    ['Active accounts', summary?.activeAccounts ?? 0],
    ['Published products', summary?.totalProducts ?? 0],
    ['Outstanding', fmt(summary?.outstandingReceivable)],
    ['Collected this month', fmt(summary?.collectionsThisMonth)],
    ['Overdue installments', summary?.overdueInstallments ?? 0],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Reports & operations</h1><p className="text-sm text-gray-500">Business KPIs, operational reports, exports and audit history.</p></div>
        <div className="flex gap-2">
          <Link href="/admin/audit-log" className="btn-secondary"><ClipboardList size={15} className="mr-1 inline" /> Audit log</Link>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/reports/export/customers`} className="btn-secondary"><Download size={15} className="mr-1 inline" /> Export customers</a>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Current KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(([label, value]) => <div key={String(label)} className="card"><p className="text-xs font-medium uppercase text-gray-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Operational reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return <Link key={card.href} href={card.href} className="card flex gap-4 transition hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: 'var(--color-primary)' }}><Icon size={20} /></div>
              <div><h2 className="font-semibold">{card.title}</h2><p className="text-sm text-gray-500">{card.desc}</p></div>
            </Link>;
          })}
        </div>
      </section>
    </div>
  );
}
