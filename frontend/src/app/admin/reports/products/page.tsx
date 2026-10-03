'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

export default function ProductsReport() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    api
      .get<any>('/api/admin/reports/products')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">
          ← Reports
        </Link>
        <h1 className="text-2xl font-bold">Product Report</h1>
        <p className="text-sm text-gray-500">
          {data?.activeProducts}/{data?.totalProducts} active
        </p>
      </div>

      {(data?.lowStock || []).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Low stock (≤ 5)</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {data.lowStock.map((p: any) => (
              <li key={p._id}>
                {p.name} — {p.inventory} left
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data?.products || []).map((p: any) => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.sku || '—'}</td>
                <td className="px-4 py-3">
                  {currency} {p.price.toLocaleString('en-PK')}
                </td>
                <td className="px-4 py-3">{p.inventory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
