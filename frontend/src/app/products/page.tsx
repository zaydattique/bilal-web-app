import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsClient from '@/components/public/ProductsClient';
import type { ProductCardData } from '@/components/public/ProductCard';

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';

async function getBusiness(): Promise<any | null> {
  const base = apiBase();
  const slug = businessSlug();
  if (!base || !slug) return null;
  const response = await fetch(
    `${base}/api/admin/business/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );
  if (!response.ok) return null;
  return (await response.json()).business || null;
}

async function getCatalogue(businessId: string) {
  const base = apiBase();
  const [productsResponse, categoriesResponse] = await Promise.all([
    fetch(`${base}/api/products?businessId=${encodeURIComponent(businessId)}&limit=50`, { cache: 'no-store' }),
    fetch(`${base}/api/categories?businessId=${encodeURIComponent(businessId)}&limit=100`, { cache: 'no-store' }),
  ]);

  return {
    products: productsResponse.ok ? ((await productsResponse.json()).products || []) as ProductCardData[] : [],
    categories: categoriesResponse.ok ? (await categoriesResponse.json()).categories || [] : [],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusiness();
  if (!businessId) return {};

  const base = apiBase();
  const slug = businessSlug();
  if (!base || !slug) return {};

  const response = await fetch(
    `${base}/api/admin/business/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );
  if (!response.ok) return {};

  const business = (await response.json()).business;
  const title = 'Products';
  const description = business?.seo?.metaDescription || business?.content?.description || 'Browse the published product catalogue.';

  return {
    title,
    description,
    alternates: { canonical: '/products' },
    openGraph: {
      type: 'website',
      title,
      description,
      ...(business?.seo?.ogImage?.publicUrl
        ? { images: [{ url: business.seo.ogImage.publicUrl, alt: business.seo.ogImage.altText || title }] }
        : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductsPage() {
  const businessId = await getBusinessId();
  if (!business) notFound();

  const { products, categories } = await getCatalogue(business._id);
  return <><JsonLd business={business} pagePath="/products" pageName="Products" pageDescription={business.seo?.metaDescription || business.content?.description} crumbs={[{name:'Products',url:'/products'}]} /><ProductsClient initialProducts={products} initialCategories={categories} /></>;
}
