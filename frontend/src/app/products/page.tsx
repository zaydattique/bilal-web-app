import type { Metadata } from 'next';
import ProductsClient from '@/components/public/ProductsClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Products',
    description: 'Browse the published product catalogue.',
    alternates: { canonical: '/products' },
    robots: { index: true, follow: true },
  };
}

export default function ProductsPage() {
  return <ProductsClient />;
}
