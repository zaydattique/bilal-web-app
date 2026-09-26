'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  featured?: boolean;
  categoryId?: { name: string; slug: string };
}

export default function CatalogPage() {
  const { business, loading: themeLoading } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!business?._id) return;
    api
      .get<{ success: boolean; products: Product[] }>(`/api/products?businessId=${business._id}`)
      .then((res) => setProducts(res.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  if (themeLoading || loading) {
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
          <Link href="/" className="text-lg font-semibold">
            {business?.businessName || 'Catalog'}
          </Link>
          <Link href="/admin/login" className="btn-secondary text-sm">
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Product Catalog</h1>

        {products.length === 0 ? (
          <p className="text-gray-500">No products available yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p._id} className="card overflow-hidden p-0">
                <div
                  className="flex h-40 items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300"
                >
                  {p.name[0]}
                </div>
                <div className="p-4">
                  {p.featured && (
                    <span
                      className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      Featured
                    </span>
                  )}
                  <h2 className="font-semibold">{p.name}</h2>
                  {p.categoryId && (
                    <p className="text-xs text-gray-500">{p.categoryId.name}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{p.description}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                      {currency} {(p.discountPrice || p.price).toLocaleString('en-PK')}
                    </span>
                    {p.discountPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {currency} {p.price.toLocaleString('en-PK')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
