'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  imageUrl?: string;
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
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <>
      {offline && (
        <div className="bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          Demo mode — API not connected. Deploy backend + seed for live products & inquiries.
        </div>
      )}
      <PublicHeader />
      <CartDrawer />
      <main className="flex-1">
        <HeroSlider />

        {categories.length > 0 && (
          <section className="container-page py-14 sm:py-16">
            <p className="eyebrow">Categories</p>
            <h2 className="section-title mt-2">Shop by category</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {categories.slice(0, 8).map((c) => (
                <Link
                  key={c._id}
                  href={`/categories/${c.slug}`}
                  className="card-hover flex items-center gap-3 p-3.5 sm:p-4"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-secondary), color-mix(in srgb, var(--color-secondary) 70%, #334155))',
                    }}
                  >
                    {c.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    {c.description && (
                      <p className="truncate text-xs text-slate-500">{c.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="container-page pb-14 sm:pb-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2 className="section-title mt-2">Featured products</h2>
            </div>
            <Link href="/products" className="btn-secondary text-sm">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div
                className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : featured.length === 0 ? (
            <div className="card py-14 text-center">
              <p className="font-display text-2xl text-slate-800">Products coming soon</p>
              <p className="mt-2 text-sm text-slate-500">
                {offline
                  ? 'Connect the API and run seed to load the demo catalogue.'
                  : 'Add featured products from the admin panel.'}
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

        <section className="border-t bg-white py-14 sm:py-20" style={{ borderColor: 'var(--color-border)' }}>
          <div className="container-page text-center">
            <p className="eyebrow">Simple process</p>
            <h2 className="section-title mt-2">How it works</h2>
            <div className="mt-10 grid gap-5 text-left sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Browse & calculate',
                  desc: 'Pick a product and see monthly amounts with the installment calculator.',
                },
                {
                  step: '02',
                  title: 'Send an inquiry',
                  desc: 'Share your name and phone — our team reaches out to confirm the plan.',
                },
                {
                  step: '03',
                  title: 'Finalize at the shop',
                  desc: 'Complete verification with CNIC and start enjoying your product.',
                },
              ].map((item) => (
                <div key={item.step} className="card-hover relative overflow-hidden">
                  <span className="font-display text-4xl text-slate-100">{item.step}</span>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
