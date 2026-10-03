'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Shield,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import HeroSlider from '@/components/public/HeroSlider';
import ProductCard, { ProductCardData } from '@/components/public/ProductCard';
import CartDrawer from '@/components/public/Cart';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function HomePage() {
  const { business, loading: themeLoading, offline } = useTheme();
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?._id || offline) {
      setLoading(false);
      return;
    }
    const bid = business._id;
    Promise.all([
      api.get<{ success: boolean; products: ProductCardData[] }>(
        `/api/products?businessId=${bid}&featured=true&limit=6`
      ),
      api.get<{ success: boolean; categories: Category[] }>(
        `/api/categories?businessId=${bid}`
      ),
    ])
      .then(([prodRes, catRes]) => {
        setFeatured(prodRes.products || []);
        setCategories(catRes.categories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id, offline]);

  if (themeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const phone = business?.contact?.phone || business?.contact?.whatsapp;
  const address = business?.contact?.address;

  return (
    <>
      {offline && (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Business information is temporarily unavailable. Please try again shortly.
        </div>
      )}
      <PublicHeader />
      <CartDrawer />
      <main className="flex-1">
        <HeroSlider />

        <section className="container-page py-14 sm:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2 className="section-title mt-2">Featured installment items</h2>
              <p className="mt-2 max-w-lg text-sm text-slate-500">
                Clear cash prices and monthly plans — no bank apps required.
              </p>
            </div>
            <Link href="/products" className="btn-secondary text-sm">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div
                className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : featured.length === 0 ? (
            <div className="card py-14 text-center">
              <p className="font-display text-2xl text-slate-800">Products coming soon</p>
              <p className="mt-2 text-sm text-slate-500">
                {offline ? 'Add products in the admin panel once the business connection is available.' : 'Add featured products in admin.'}
              </p>
              <Link href="/products" className="btn-primary mt-6 inline-flex">
                Browse catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xs:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

        {categories.length > 0 && (
          <section className="border-y bg-white py-14 sm:py-16" style={{ borderColor: 'var(--color-border)' }}>
            <div className="container-page">
              <p className="eyebrow">Browse</p>
              <h2 className="section-title mt-2">Shop by category</h2>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {categories.slice(0, 8).map((c) => (
                  <Link
                    key={c._id}
                    href={`/categories/${c.slug}`}
                    className="card-hover flex items-center gap-3 p-4"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                      style={{
                        background:
                          'linear-gradient(135deg, var(--color-secondary), color-mix(in srgb, var(--color-secondary) 70%, #475569))',
                      }}
                    >
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                      {c.description && (
                        <p className="truncate text-xs text-slate-500">{c.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="how-it-works" className="container-page py-14 sm:py-20">
          <div className="text-center">
            <p className="eyebrow">Simple process</p>
            <h2 className="section-title mt-2">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              No bank approval maze. Choose online, finalize at the shop with CNIC.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: '01', title: 'Choose your item', desc: 'Browse phones, LEDs, fridges and more.' },
              { n: '02', title: 'Calculate plan', desc: 'See monthly amount with the online calculator.' },
              { n: '03', title: 'Send inquiry', desc: 'Share name & phone — we call you back.' },
              { n: '04', title: 'Visit with CNIC', desc: 'Confirm plan and documents at the shop.' },
              { n: '05', title: 'Pay monthly', desc: 'Fixed installment — clear and recorded.' },
            ].map((s) => (
              <div key={s.n} className="card-hover relative text-left">
                <span className="font-display text-3xl text-slate-100">{s.n}</span>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-slate-50 py-14 sm:py-16" style={{ borderColor: 'var(--color-border)' }}>
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="eyebrow">Requirements</p>
                <h2 className="section-title mt-2">What you need</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Same clear shop process families already know — transparent plans, no hidden bank fees.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    { icon: FileText, t: 'Original CNIC' },
                    { icon: UserCheck, t: 'Guarantor with valid CNIC' },
                    { icon: MapPin, t: 'Proof of address' },
                    { icon: Smartphone, t: 'Valid phone number' },
                    { icon: CreditCard, t: 'Advance / down payment' },
                  ].map((item) => (
                    <li key={item.t} className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <item.icon size={18} />
                      </span>
                      <span className="text-sm font-medium text-slate-800">{item.t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6 sm:p-8">
                <p className="eyebrow">Why families choose us</p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">Clear monthly amounts</h3>
                <ul className="mt-6 space-y-4">
                  {[
                    'Transparent fixed installment — written and recorded',
                    'Same-day collection after shop verification',
                    'Local team in Kot Khawaja Saeed / Lahore',
                    'No confusing bank portals — just CNIC & plan',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm text-slate-600">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0"
                        style={{ color: 'var(--color-accent)' }}
                      />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/products" className="btn-primary">
                    Browse products
                  </Link>
                  {phone && (
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn-secondary">
                      <Phone size={16} /> Call shop
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-14 sm:py-20">
          <div
            className="relative overflow-hidden rounded-[1.75rem] px-6 py-12 text-center text-white sm:px-12 sm:py-16"
            style={{
              background:
                'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, color-mix(in srgb, var(--color-primary) 45%, #0f172a) 100%)',
            }}
          >
            <Shield className="mx-auto h-10 w-10 opacity-80" />
            <h2 className="font-display mt-4 text-3xl sm:text-4xl">Visit or call the shop</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
              {address || 'Kot Khawaja Saeed, Lahore'} · finalize your plan in person with CNIC.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-900"
                >
                  <Phone size={16} /> {phone}
                </a>
              )}
              <Link
                href="/products"
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white"
              >
                See catalogue
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
