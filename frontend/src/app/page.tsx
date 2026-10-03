import type { Metadata } from 'next';
import HomePage, { HomeBusiness } from '@/components/public/HomePage';
import JsonLd from '@/components/public/JsonLd';

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';

async function getBusiness(): Promise<HomeBusiness | null> {
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

async function getHomeData(businessId: string) {
  const base = apiBase();
  const [productsResponse, categoriesResponse] = await Promise.all([
    fetch(
      `${base}/api/products?businessId=${encodeURIComponent(businessId)}&featured=true&limit=6`,
      { cache: 'no-store' }
    ),
    fetch(
      `${base}/api/categories?businessId=${encodeURIComponent(businessId)}&limit=100`,
      { cache: 'no-store' }
    ),
  ]);

  const products = productsResponse.ok ? (await productsResponse.json()).products || [] : [];
  const categories = categoriesResponse.ok ? (await categoriesResponse.json()).categories || [] : [];
  return { products, categories };
}

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusiness();
  if (!business) return {};
  return {
    title: business.content?.tagline || business.businessName,
    description: business.content?.description || business.businessName,
    alternates: { canonical: '/' },
    robots: { index: true, follow: true },
  };
}

export default async function HomeRoute() {
  const business = await getBusiness();
  if (!business) {
    return <HomePageUnavailable />;
  }

  const { products, categories } = await getHomeData(business._id);
  return (
    <>
      <JsonLd business={business} pagePath="/" pageName={business.content?.tagline || business.businessName} pageDescription={business.content?.description || business.businessName} />
      <HomePage
      initialBusiness={business}
      initialFeatured={products}
      initialCategories={categories}
      />
    </>
  );
}

function HomePageUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Store temporarily unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">Please try again shortly.</p>
      </div>
    </main>
  );
}
