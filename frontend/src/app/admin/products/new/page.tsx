'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Category {
  _id: string;
  name: string;
}

export default function NewProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    fullDescription: '',
    price: '',
    discountPrice: '',
    categoryId: '',
    inventory: '0',
    sku: '',
    images: '',
    featured: false,
    isActive: true,
  });

  useEffect(() => {
    if (!token) return;
    api
      .get<{ success: boolean; categories: Category[] }>('/api/categories', token)
      .then((res) => setCategories(res.categories))
      .catch(console.error);
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const images = form.images
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      await api.post(
        '/api/products',
        {
          name: form.name,
          description: form.description || undefined,
          fullDescription: form.fullDescription || undefined,
          price: Number(form.price),
          discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
          categoryId: form.categoryId || undefined,
          inventory: Number(form.inventory) || 0,
          sku: form.sku || undefined,
          images,
          featured: form.featured,
          isActive: form.isActive,
        },
        token
      );
      router.push('/admin/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Product</h1>
          <p className="text-sm text-gray-500">
            Saved to the database — storefront loads it from the API (not hardcoded).
          </p>
        </div>
        <Link href="/admin/products" className="btn-secondary text-sm">
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div>
          <label className="mb-1 block text-sm font-medium">Name *</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Samsung Galaxy A55"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Short description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="One-line summary for cards"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Full description</label>
          <textarea
            className="input min-h-[100px]"
            value={form.fullDescription}
            onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
            placeholder="Longer detail shown on product page"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Price (PKR) *</label>
            <input
              className="input"
              type="number"
              min={0}
              step="1"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Discount / sale price</label>
            <input
              className="input"
              type="number"
              min={0}
              step="1"
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">SKU</label>
            <input
              className="input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Image URLs</label>
          <textarea
            className="input min-h-[72px]"
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
            placeholder="One URL per line or comma-separated"
          />
          <p className="mt-1 text-xs text-gray-500">
            Example: https://picsum.photos/seed/demo1/800/600
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Inventory</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.inventory}
              onChange={(e) => setForm({ ...form, inventory: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Featured
            </label>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
