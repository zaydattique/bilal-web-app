'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ShoppingBag, Phone } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import clsx from 'clsx';

const links = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
];

export default function PublicHeader() {
  const { business } = useTheme();
  const { totalItems, setOpen } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const phone = business?.contact?.phone || business?.contact?.whatsapp;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl" style={{ borderColor: 'var(--color-border)' }}>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {business?.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo.url}
              alt={business.logo.altText || business.businessName}
              className="h-9 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))',
              }}
            >
              {(business?.businessName || 'B')[0]}
            </div>
          )}
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight sm:text-base">
              {business?.businessName || 'Installment Store'}
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">
              Easy monthly installments · Lahore
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'rounded-xl px-3.5 py-2 text-sm font-medium transition',
                pathname === l.href
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              {l.label}
            </Link>
          ))}
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn-ghost ml-1 text-slate-600">
              <Phone size={16} />
              <span className="hidden lg:inline">{phone}</span>
            </a>
          )}
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost relative" aria-label="Open cart">
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {totalItems}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost relative p-2.5" aria-label="Cart">
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {totalItems}
              </span>
            )}
          </button>
          <button
            type="button"
            className="btn-ghost p-2.5"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 top-16 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="safe-pb absolute inset-x-0 top-0 border-b bg-white px-4 py-4 shadow-lift" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={clsx(
                    'rounded-xl px-4 py-3 text-base font-medium',
                    pathname === l.href ? 'bg-slate-100' : 'hover:bg-slate-50'
                  )}
                >
                  {l.label}
                </Link>
              ))}
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Phone size={18} />
                  Call shop
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
