'use client';

import Link from 'next/link';
import CategoryEditor from '@/components/admin/CategoryEditor';

export default function NewCategoryPage() {
  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">New Category</h1><p className="text-sm text-gray-500">Manage category content, typed product fields and SEO.</p></div><Link href="/admin/categories" className="btn-secondary text-sm">Back</Link></div>
    <CategoryEditor />
  </div>;
}
