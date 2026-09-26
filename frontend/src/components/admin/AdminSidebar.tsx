'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  Wallet,
  Settings,
  LogOut,
  FolderTree,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import clsx from 'clsx';

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/admin/payments', label: 'Payments', icon: Wallet },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const { business } = useTheme();

  return (
    <aside className="flex w-64 flex-col border-r bg-white" style={{ borderColor: 'var(--color-border)' }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {(business?.businessName || 'A')[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{business?.businessName || 'Admin'}</p>
            <p className="truncate text-xs text-gray-500">{admin?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
              style={active ? { background: 'var(--color-primary)' } : undefined}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
