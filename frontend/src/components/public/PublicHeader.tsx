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
    const onScroll = () => setScrolled(window.scrollY > 6);
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

  const phone = business?.contact?.phone || business?.socialMedia?.whatsapp;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4">
        <header
          className={clsx(
            'pointer-events-auto flex w-full max-w-[34rem] items-center gap-1 rounded-full border px-1.5 py-1.5 transition-all duration-300 sm:gap-2 sm:px-2.5 sm:py-2',
            scrolled
              ? 'border-black/[0.06] bg-white/75 shadow-[0_8px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl'
              : 'border-black/[0.08] bg-white/65 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl'
          )}
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}
        >
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-0.5 pl-1 pr-2 active:opacity-80"
          >
            {business?.logo?.primary?.publicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo.primary.publicUrl}
                alt={business.logo.primary.altText || business.businessName}
                className="h-8 w-auto max-w-[88px] object-contain sm:h-9 sm:max-w-[110px]"
              />
            ) : (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-sm"
                style={{
                  background:
                    'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 88%, white), var(--color-primary))',
                }}
              >
                {(business?.businessName || 'B')[0]}
              </div>
            )}
            <span className="truncate text-[13px] font-semibold tracking-tight text-slate-900 sm:text-[14px]">
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
                    'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-black/[0.05] active:scale-95 lg:inline-flex"
                aria-label="Call"
              >
                <Phone size={18} strokeWidth={1.75} />
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition hover:bg-black/[0.05] active:scale-95"
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.75} />
              {totalItems > 0 && (
                <span
                  className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {totalItems}
                </span>
              )}
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition hover:bg-black/[0.05] active:scale-95 md:hidden"
              aria-label={menuOpen ? 'Close' : 'Menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
            </button>
          </div>
        </header>
      </div>

      <div className="h-[4.25rem] sm:h-[4.75rem]" />

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute inset-x-3 top-[4.75rem] overflow-hidden rounded-[22px] border border-black/[0.06] bg-white/90 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.2)]"
            style={{ WebkitBackdropFilter: 'blur(28px) saturate(180%)' }}
          >
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
                    'flex min-h-[48px] items-center rounded-2xl px-4 text-[16px] font-medium transition active:scale-[0.99]',
                    active ? 'bg-slate-900 text-white' : 'text-slate-800 active:bg-black/[0.04]'
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex min-h-[48px] items-center gap-2.5 rounded-2xl px-4 text-[16px] font-medium text-slate-800 active:bg-black/[0.04]"
              >
                <Phone size={18} strokeWidth={1.75} />
                Call shop
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
