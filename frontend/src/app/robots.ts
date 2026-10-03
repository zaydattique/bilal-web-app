import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
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
        disallow: ['/admin', '/portal'],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
