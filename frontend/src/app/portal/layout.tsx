'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { customer, loading, token, logout } = useCustomerAuth();
  const { business } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/portal/login';

  useEffect(() => {
    if (!loading && !token && !isLogin) router.replace('/portal/login');
    if (!loading && token && isLogin) router.replace('/portal');
  }, [loading, token, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{business?.businessName || 'Portal'}</p>
            <p className="text-xs text-gray-500">
              {customer.firstName} {customer.lastName} · {customer.accountNumber}
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/portal" className="font-medium hover:underline">
              Accounts
            </Link>
            <Link href="/portal/payments" className="font-medium hover:underline">
              Payments
            </Link>
            <button onClick={logout} className="text-gray-500 hover:underline">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
