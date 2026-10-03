'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductEditor from '@/components/admin/ProductEditor';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold">Edit Product</h1><p className="text-sm text-gray-500">Update the canonical product record.</p></div>
      <Link href="/admin/products" className="btn-secondary text-sm">Back</Link>
    </div>
    <ProductEditor productId={id} />
  </div>;
}
