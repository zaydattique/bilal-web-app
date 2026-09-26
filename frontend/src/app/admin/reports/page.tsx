'use client';

import Link from 'next/link';
import { AlertTriangle, TrendingUp, Users, Package, ListOrdered } from 'lucide-react';

const cards = [
  {
    href: '/admin/reports/due-list',
    title: 'Late / Due Installments',
    desc: 'Overdue & upcoming dues with WhatsApp reminders',
    icon: AlertTriangle,
    color: '#e74c3c',
  },
  {
    href: '/admin/reports/collections',
    title: 'Collections',
    desc: 'Daily collection trend',
    icon: TrendingUp,
    color: '#2ecc71',
  },
  {
    href: '/admin/reports/customers',
    title: 'Customers',
    desc: 'Top dues & recent signups',
    icon: Users,
    color: '#3498db',
  },
  {
    href: '/admin/reports/products',
    title: 'Products',
    desc: 'Inventory & low stock',
    icon: Package,
    color: '#9b59b6',
  },
  {
    href: '/admin/reports/defaults',
    title: 'Defaults / Aging',
    desc: 'Aging buckets & defaulted accounts',
    icon: ListOrdered,
    color: '#e67e22',
  },
];

export default function ReportsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-gray-500">Analytics & collections insights</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="card flex gap-4 transition hover:shadow-md">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: c.color }}
              >
                <Icon size={20} />
              </div>
              <div>
                <h2 className="font-semibold">{c.title}</h2>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
