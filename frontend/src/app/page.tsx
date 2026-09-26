'use client';

import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function HomePage() {
  const { business, loading } = useTheme();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {business?.logo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo.url}
                alt={business.logo.altText || business.businessName}
                className="h-10"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                {(business?.businessName || 'B')[0]}
              </div>
            )}
            <span className="text-lg font-semibold">
              {business?.businessName || 'Installment Store'}
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm font-medium hover:underline">
              Catalog
            </Link>
            <Link href="/portal/login" className="text-sm font-medium hover:underline">
              My Account
            </Link>
            <Link href="/admin/login" className="btn-primary text-sm">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Buy on easy installments
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          {business?.seo?.metaDescription ||
            'Premium products with flexible payment plans tailored for you.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/catalog" className="btn-primary px-6 py-3 text-base">
            Browse Catalog
          </Link>
          <Link href="/portal/login" className="btn-secondary px-6 py-3 text-base">
            Customer Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
