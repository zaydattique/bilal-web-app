'use client';

import Link from 'next/link';
import ProductEditor from '@/components/admin/ProductEditor';

export default function NewProductPage() {
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold">New Product</h1><p className="text-sm text-gray-500">Manage the complete product record from the admin panel.</p></div>
      <Link href="/admin/products" className="btn-secondary text-sm">Back</Link>
    </div>
    <ProductEditor />
  </div>;
}
