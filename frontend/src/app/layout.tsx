import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CartProvider } from '@/context/CartContext';
import CookieConsent from '@/components/public/CookieConsent';
import AnalyticsTracker from '@/components/public/AnalyticsTracker';
import JsonLd from '@/components/public/JsonLd';

interface PublicBusiness {
  businessName?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { publicUrl?: string; altText?: string } | null;
  };
  content?: {
    description?: string;
  };
  favicon?: { publicUrl?: string } | null;
}

const getPublicBusiness = async (): Promise<PublicBusiness | null> => {
  const slug = process.env.NEXT_PUBLIC_BUSINESS_SLUG;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!slug || !apiUrl) return null;

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/admin/business/public/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.business || null;
  } catch {
    return null;
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const business = await getPublicBusiness();
  const title = business?.seo?.metaTitle || business?.businessName || '';
  const description = business?.seo?.metaDescription || business?.content?.description || '';
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  let metadataBase: URL | undefined;
  if (rawSiteUrl) {
    try {
      const parsed = new URL(rawSiteUrl);
      if (['http:', 'https:'].includes(parsed.protocol)) metadataBase = parsed;
    } catch {
      metadataBase = undefined;
    }
  }

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: title || 'Store',
      template: business?.businessName ? `%s | ${business.businessName}` : '%s',
    },
    description: description || undefined,
    openGraph: {
      type: 'website',
      locale: 'en_PK',
      siteName: business?.businessName || undefined,
      ...(metadataBase ? { url: metadataBase.toString().replace(/\/$/, '') } : {}),
      ...(business?.seo?.ogImage?.publicUrl
        ? {
            images: [
              {
                url: business.seo.ogImage.publicUrl,
                alt: business.seo.ogImage.altText || title || business.businessName || 'Store',
              },
            ],
          }
        : {}),
    },
    ...(business?.favicon?.publicUrl
      ? { icons: { icon: business.favicon.publicUrl } }
      : {}),
    twitter: { card: 'summary_large_image' },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <AuthProvider>
          <CustomerAuthProvider>
            <ThemeProvider>
              <CartProvider>
                <JsonLd />
                <AnalyticsTracker />
                {children}
                <CookieConsent />
              </CartProvider>
            </ThemeProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
