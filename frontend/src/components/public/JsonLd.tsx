'use client';

import { useTheme } from '@/context/ThemeContext';

export default function JsonLd() {
  const { business } = useTheme();
  if (!business) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: business.businessName,
    description: business.seo?.metaDescription || business.content?.description || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    telephone: business.contact?.phone,
    email: business.contact?.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.contact?.address,
      addressLocality: business.contact?.city,
      addressCountry: business.contact?.country || undefined,
    },
    priceRange: business.settings?.currencyCode ? business.settings.currencyCode : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
