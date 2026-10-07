import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ProductDetailClient, { PublicProduct } from '@/components/public/ProductDetailClient';
import JsonLd from '@/components/public/JsonLd';

interface Business {
  _id: string;
  businessName: string;
  businessSlug: string;
  settings?: { currencySymbol?: string; currencyCode?: string };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { publicUrl?: string; altText?: string } | null;
  };
  contact?: { phone?: string; email?: string; address?: string; city?: string; country?: string };
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string; whatsapp?: string };
  content?: { description?: string; serviceArea?: string; hours?: string };
  logo?: { primary?: { publicUrl?: string } | null } | null;
}

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';

async function getBusiness(): Promise<Business | null> {
  const base = apiBase();
  const slug = businessSlug();
  if (!base || !slug) return null;
  const r = await fetch(`${base}/api/admin/business/public/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return (await r.json()).business || null;
}

async function getProduct(
  slug: string,
  businessId: string
): Promise<{ product?: PublicProduct; redirect?: string; status: number } | null> {
  const r = await fetch(
    `${apiBase()}/api/products/${encodeURIComponent(slug)}?businessId=${encodeURIComponent(businessId)}`,
    { cache: 'no-store', redirect: 'manual' }
  );
  if (r.status === 404) return null;
  if (r.status === 301) {
    const location = r.headers.get('location');
    return location ? { redirect: location, status: 301 } : null;
  }
  if (!r.ok) return null;
  const data = await r.json();
  return { ...data, status: r.status };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness();
  if (!business) return {};
  const result = await getProduct(slug, business._id);
  if (!result?.product) return {};
  const product = result.product;
  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || product.shortDescription || product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.seo?.title || product.name,
      description: product.seo?.description || product.shortDescription || product.description,
      images: product.media?.[0]?.publicUrl
        ? [{ url: product.media[0].publicUrl, alt: product.media[0].altText || product.name }]
        : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusiness();
  if (!business) notFound();
  const result = await getProduct(slug, business._id);
  if (!result) notFound();
  if (result.redirect) redirect(result.redirect);
  if (!result.product) notFound();
  const product = result.product;

  return (
    <>
      <JsonLd
        business={business}
        pagePath={`/products/${product.slug}`}
        pageName={product.name}
        pageDescription={product.seo?.description || product.shortDescription || product.description}
        crumbs={[
          { name: 'Products', url: '/products' },
          { name: product.name, url: `/products/${product.slug}` },
        ]}
        product={product}
      />
      <ProductDetailClient product={product} business={business} />
    </>
  );
}
