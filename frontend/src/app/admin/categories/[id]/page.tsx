'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import CategoryEditor from '@/components/admin/CategoryEditor';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Edit Category</h1><p className="text-sm text-gray-500">Update the canonical category record.</p></div><Link href="/admin/categories" className="btn-secondary text-sm">Back</Link></div>
    <CategoryEditor categoryId={id} />
  </div>;
}
