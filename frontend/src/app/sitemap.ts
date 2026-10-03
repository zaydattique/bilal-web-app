import type { MetadataRoute } from 'next';

interface Business {
  _id: string;
}

interface PageRecord {
  slug: string;
  updatedAt?: string;
}

const getApiBase = (): string | null => {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) return null;
  return value.replace(/\/$/, '');
};

const getBusinessSlug = (): string | null => {
  const value = process.env.NEXT_PUBLIC_BUSINESS_SLUG?.trim();
  return value || null;
};

const getSiteUrl = (): string | null => {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

async function getBusiness(base: string, slug: string): Promise<Business | null> {
  try {
    const response = await fetch(
      `${base}/api/admin/business/public/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.business || null;
  } catch {
    return null;
  }
}

async function getPublishedRecords(
  resource: 'products' | 'categories',
  businessId: string,
  base: string
): Promise<PageRecord[]> {
  const records: PageRecord[] = [];
  const limit = 50;

  for (let page = 1; page <= 200; page += 1) {
    try {
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
    } catch {
      break;
    }
  }

  return records;
}

const toDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const base = getApiBase();
  const slug = getBusinessSlug();

  if (!baseUrl || !base || !slug) return [];

  const business = await getBusiness(base, slug);
  if (!business) return [];

  const now = new Date();
  const [products, categories] = await Promise.all([
    getPublishedRecords('products', business._id, base),
    getPublishedRecords('categories', business._id, base),
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
      lastModified: toDate(category.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${encodeURIComponent(product.slug)}`,
      lastModified: toDate(product.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
