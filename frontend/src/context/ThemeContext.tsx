'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface Branding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textDark: string;
  textLight: string;
  backgroundColor: string;
  borderColor: string;
}

interface MediaReference {
  _id: string;
  publicUrl: string;
  altText?: string;
  purpose?: string;
}

interface Business {
  _id: string;
  businessName: string;
  businessSlug: string;
  logo?: {
    primary?: MediaReference | null;
    light?: MediaReference | null;
    dark?: MediaReference | null;
    icon?: MediaReference | null;
  };
  favicon?: MediaReference | null;
  heroBanners?: MediaReference[];

  branding: Branding;
  typography?: { fontFamily?: string; headingScale?: number; lineHeight?: number };
  contact?: { phone?: string; email?: string; address?: string; city?: string; country?: string };
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string; whatsapp?: string };
  policies?: { termsUrl?: string; privacyUrl?: string; returnPolicy?: string; warrantyClaim?: string };
  content?: {
    tagline?: string;
    description?: string;
    serviceArea?: string;
    hours?: string;
    footerText?: string;
    requirements?: string[];
    trustPoints?: string[];
    howItWorks?: { step: string; title: string; description: string }[];
    heroSlides?: { title: string; subtitle: string; cta: string; href: string }[];
  };
  settings?: {
    currencySymbol?: string;
    currencyCode?: string;
    timezone?: string;
    dateFormat?: string;
    maxInstallments?: number;
    minDownPayment?: number;
    showCustomerPortalLink?: boolean;
  };
  seo?: { metaTitle?: string; metaDescription?: string; metaKeywords?: string[]; ogImage?: MediaReference | null };
}

interface ThemeContextType {
  business: Business | null;
  loading: boolean;
  offline: boolean;
  refresh: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#c41e3a',
  secondaryColor: '#1a2332',
  accentColor: '#0d9488',
  textDark: '#0f172a',
  textLight: '#f8fafc',
  backgroundColor: '#fafbfc',
  borderColor: '#e2e8f0',
};

function applyCssVars(branding: Branding, typography?: { fontFamily?: string; headingScale?: number; lineHeight?: number }) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primaryColor);
  root.style.setProperty('--color-secondary', branding.secondaryColor);
  root.style.setProperty('--color-accent', branding.accentColor);
  root.style.setProperty('--color-text-dark', branding.textDark);
  root.style.setProperty('--color-text-light', branding.textLight);
  root.style.setProperty('--color-background', branding.backgroundColor);
  root.style.setProperty('--color-border', branding.borderColor);
  if (typography?.fontFamily) root.style.setProperty('--font-family', typography.fontFamily);
  if (typography?.headingScale) root.style.setProperty('--heading-scale', String(typography.headingScale));
  if (typography?.lineHeight) root.style.setProperty('--content-line-height', String(typography.lineHeight));
}

export function ThemeProvider({
  children,
  slug,
}: {
  children: React.ReactNode;
  slug?: string;
}) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = async () => {
    const businessSlug = slug || process.env.NEXT_PUBLIC_BUSINESS_SLUG;

    if (!businessSlug) {
      setBusiness(null);
      setOffline(true);
      applyCssVars(DEFAULT_BRANDING);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await api.get<{ success: boolean; business: Business }>(
        `/api/admin/business/public/${businessSlug}`
      );
      setBusiness(res.business);
      setOffline(false);
      applyCssVars(res.business.branding || DEFAULT_BRANDING, res.business.typography);
    } catch {
      setBusiness(null);
      setOffline(true);
      applyCssVars(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [slug]);

  return (
    <ThemeContext.Provider value={{ business, loading, offline, refresh: load }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
