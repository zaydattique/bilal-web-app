import type { MetadataRoute } from 'next';

interface Business {
  _id: string;
}

interface PageRecord {
  slug: string;
  updatedAt?: string;
}

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const businessSlug = () => process.env.NEXT_PUBLIC_BUSINESS_SLUG || '';
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || '';

async function getBusiness(): Promise<Business | null> {
  const base = apiBase();
  const slug = businessSlug();
  if (!base || !slug) return null;

  const response = await fetch(
    `${base}/api/admin/business/public/${encodeURIComponent(slug)}`,
    { cache: 'no-store' }
  );
  if (!response.ok) return null;

  const data = await response.json();
  return data.business || null;
}

async function getPublishedRecords(
  resource: 'products' | 'categories',
  businessId: string
): Promise<PageRecord[]> {
  const base = apiBase();
  const records: PageRecord[] = [];
  const limit = 50;

  for (let page = 1; page <= 200; page += 1) {
    const response = await fetch(
      `${base}/api/${resource}?businessId=${encodeURIComponent(businessId)}&page=${page}&limit=${limit}`,
      { cache: 'no-store' }
    );

    if (!response.ok) break;

    const data = await response.json();
    const batch = resource === 'products' ? data.products || [] : data.categories || [];

    records.push(
      ...batch
        .filter((record: PageRecord) => record.slug)
        .map((record: PageRecord) => ({
          slug: record.slug,
          updatedAt: record.updatedAt,
        }))
    );

    if (batch.length < limit) break;
  }

  return records;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  if (!baseUrl) return [];

  const business = await getBusiness();
  if (!business) return [];

  const now = new Date();
  const [products, categories] = await Promise.all([
    getPublishedRecords('products', business._id),
    getPublishedRecords('categories', business._id),
  ]);

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...categories.map((category) => ({
      url: `${baseUrl}/categories/${encodeURIComponent(category.slug)}`,
      lastModified: category.updatedAt ? new Date(category.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${encodeURIComponent(product.slug)}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
