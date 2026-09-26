'use client';

import { useTheme } from '@/context/ThemeContext';

export default function JsonLd() {
  const { business } = useTheme();
  if (!business) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: business.businessName,
    description:
      business.seo?.metaDescription ||
      'Electronics and home appliances on easy monthly installments in Lahore.',
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    telephone: business.contact?.phone,
    email: business.contact?.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.contact?.address,
      addressLocality: business.contact?.city || 'Lahore',
      addressCountry: 'PK',
    },
    priceRange: 'PKR',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
