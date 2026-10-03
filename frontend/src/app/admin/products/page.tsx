'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Product {
  _id: string;
  name: string;
  slug: string;
  cashPrice: number;
  discountPrice?: number;
  inventory: number;
  sku?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  featured: boolean;
  categoryId?: { name: string };
}

export default function ProductsPage() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = business?.settings?.currencySymbol || 'PKR';

  useEffect(() => {
    if (!admin) return;
    api
      .get<{ success: boolean; products: Product[] }>('/api/products?active=false')
      .then((res) => setProducts(res.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">{products.length} products</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary text-sm">
          + Add Product
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.sku}</div>
                </td>
                <td className="px-4 py-3">{p.categoryId?.name || '—'}</td>
                <td className="px-4 py-3">
                  {currency} {((p.discountPrice ?? p.cashPrice)).toLocaleString('en-PK').toLocaleString('en-PK')}
                </td>
                <td className="px-4 py-3">{p.inventory}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'published' ? 'bg-green-100 text-green-700' : p.status === 'scheduled' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3"><Link href={`/admin/products/${p._id}`} className="text-primary underline">Edit</Link></td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No products yet.{' '}
                  <Link href="/admin/products/new" className="text-primary underline">
                    Add one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
