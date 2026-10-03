'use client';

import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function PublicFooter() {
  const { business } = useTheme();
  const year = new Date().getFullYear();
  const contact = business?.contact || {};

  return (
    <footer className="mt-auto border-t bg-[var(--color-secondary)] text-slate-300" style={{ borderColor: 'transparent' }}>
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-2xl text-white">{business?.businessName || 'Installment Store'}</p>
          {business?.content?.footerText && (
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">{business.content.footerText}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/products" className="transition hover:text-white">
                All products
              </Link>
            </li>
            {business?.policies?.privacyUrl && (
              <li>
                <a href={business.policies.privacyUrl} className="transition hover:text-white">Privacy policy</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Visit</p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            {contact.address && <li>{contact.address}</li>}
            <li>{contact.city || 'Lahore'}, Pakistan</li>
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Business links</p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            {business?.policies?.termsUrl && <li><a href={business.policies.termsUrl} className="hover:text-white">Terms</a></li>}
            {business?.policies?.privacyUrl && <li><a href={business.policies.privacyUrl} className="hover:text-white">Privacy</a></li>}
            {business?.policies?.returnPolicy && <li><span>Return policy available from the business</span></li>}
            {business?.socialMedia?.instagram && <li><a href={business.socialMedia.instagram} rel="noreferrer" className="hover:text-white">Instagram</a></li>}
            {business?.socialMedia?.facebook && <li><a href={business.socialMedia.facebook} rel="noreferrer" className="hover:text-white">Facebook</a></li>}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">How plans work</p>
          {business?.content?.serviceArea && (
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{business.content.serviceArea}</p>
          )}
          {business?.content?.hours && (
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{business.content.hours}</p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {business?.businessName || 'Store'}. All rights reserved.
          </span>
          <span>{business?.settings?.currencyCode || business?.settings?.currencySymbol || ''}</span>
        </div>
      </div>
    </footer>
  );
}
