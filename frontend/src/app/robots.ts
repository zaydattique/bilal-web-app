import type { MetadataRoute } from 'next';

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

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    return {
      rules: [{ userAgent: '*', disallow: ['/'] }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin', '/portal', '/api'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
