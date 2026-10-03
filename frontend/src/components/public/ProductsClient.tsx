'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import ProductCard, { ProductCardData } from '@/components/public/ProductCard';
import CartDrawer from '@/components/public/Cart';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

function ProductsContent() {
  const { business, loading: themeLoading } = useTheme();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category') || '';

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    if (!business?._id) return;
    api
      .get<{ success: boolean; categories: Category[] }>(
        `/api/categories?businessId=${business._id}`
      )
      .then((res) => {
        setCategories(res.categories || []);
        if (categorySlug) {
          const match = (res.categories || []).find((c) => c.slug === categorySlug);
          if (match) setSelectedCategoryId(match._id);
        }
      })
      .catch(console.error);
  }, [business?._id, categorySlug]);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    const params = new URLSearchParams({
      businessId: business._id,
      limit: '50',
    });
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
    if (search.trim()) params.set('search', search.trim());

    api
      .get<{ success: boolean; products: ProductCardData[] }>(
        `/api/products?${params.toString()}`
      )
      .then((res) => setProducts(res.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id, selectedCategoryId, search]);

  const title = useMemo(() => {
    if (selectedCategoryId) {
      const cat = categories.find((c) => c._id === selectedCategoryId);
      return cat ? cat.name : 'Products';
    }
    return 'All products';
  }, [selectedCategoryId, categories]);

  if (themeLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <main className="container-page py-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="section-title mt-1">{title}</h1>
        </div>
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              !selectedCategoryId ? 'text-white' : 'hover:bg-gray-50'
            }`}
            style={
              !selectedCategoryId
                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                : { borderColor: 'var(--color-border)' }
            }
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setSelectedCategoryId(c._id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                selectedCategoryId === c._id ? 'text-white' : 'hover:bg-gray-50'
              }`}
              style={
                selectedCategoryId === c._id
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                  : { borderColor: 'var(--color-border)' }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : products.length === 0 ? (
        <div className="card py-16 text-center text-gray-500">
          No products found. Try a different category or search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xs:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <>
      <PublicHeader />
      <CartDrawer />
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        }
      >
        <ProductsContent />
      </Suspense>
      <PublicFooter />
    </>
  );
}
