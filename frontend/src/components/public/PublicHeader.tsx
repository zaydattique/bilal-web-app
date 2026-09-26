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
  { href: '/#how-it-works', label: 'How it works' },
];

export default function PublicHeader() {
  const { business } = useTheme();
  const { totalItems, setOpen } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const phone = business?.contact?.phone || business?.contact?.whatsapp;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
        <header
          className={clsx(
            'pointer-events-auto flex w-full max-w-3xl items-center gap-2 rounded-full border px-2 py-1.5 transition-all duration-300 sm:gap-3 sm:px-3 sm:py-2',
            scrolled
              ? 'border-white/20 bg-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl'
              : 'border-white/30 bg-white/70 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl'
          )}
        >
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 pl-1 sm:pl-1.5">
            {business?.logo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo.url}
                alt={business.logo.altText || business.businessName}
                className="h-8 w-auto max-w-[100px] object-contain sm:h-9"
              />
            ) : (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm"
                style={{
                  background:
                    'linear-gradient(145deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 65%, #000))',
                }}
              >
                {(business?.businessName || 'B')[0]}
              </div>
            )}
            <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900 sm:text-sm">
              {business?.businessName || 'Installment Store'}
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const active =
                l.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(l.href.split('#')[0]) && l.href !== '/';
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-[13px] font-medium transition',
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-black/5 hover:text-slate-900'
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="hidden rounded-full p-2 text-slate-600 transition hover:bg-black/5 lg:inline-flex"
                aria-label="Call"
              >
                <Phone size={18} strokeWidth={1.75} />
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative rounded-full p-2 text-slate-700 transition hover:bg-black/5"
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.75} />
              {totalItems > 0 && (
                <span
                  className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {totalItems}
                </span>
              )}
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-slate-700 transition hover:bg-black/5 md:hidden"
              aria-label={menuOpen ? 'Close' : 'Menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>
      </div>

      <div className="h-16 sm:h-[4.25rem]" />

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-3 top-[4.5rem] overflow-hidden rounded-3xl border border-white/40 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-2xl px-4 py-3.5 text-base font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 rounded-2xl px-4 py-3.5 text-base font-medium text-slate-800 hover:bg-slate-50"
              >
                <Phone size={18} /> Call shop
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
