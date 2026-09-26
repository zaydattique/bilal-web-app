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

interface Business {
  _id: string;
  businessName: string;
  businessSlug: string;
  logo?: { url?: string; altText?: string };
  branding: Branding;
  typography?: { fontFamily?: string };
  contact?: Record<string, string>;
  settings?: {
    currencySymbol?: string;
    currencyCode?: string;
    maxInstallments?: number;
    minDownPayment?: number;
  };
  seo?: { metaTitle?: string; metaDescription?: string };
}

interface ThemeContextType {
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#e74c3c',
  secondaryColor: '#3498db',
  accentColor: '#2ecc71',
  textDark: '#2c3e50',
  textLight: '#ecf0f1',
  backgroundColor: '#ffffff',
  borderColor: '#bdc3c7',
};

function applyCssVars(branding: Branding, fontFamily?: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primaryColor);
  root.style.setProperty('--color-secondary', branding.secondaryColor);
  root.style.setProperty('--color-accent', branding.accentColor);
  root.style.setProperty('--color-text-dark', branding.textDark);
  root.style.setProperty('--color-text-light', branding.textLight);
  root.style.setProperty('--color-background', branding.backgroundColor);
  root.style.setProperty('--color-border', branding.borderColor);
  if (fontFamily) root.style.setProperty('--font-family', fontFamily);
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

  const load = async () => {
    const businessSlug = slug || process.env.NEXT_PUBLIC_BUSINESS_SLUG || 'bilal-electronics';
    try {
      const res = await api.get<{ success: boolean; business: Business }>(
        `/api/admin/business/public/${businessSlug}`
      );
      setBusiness(res.business);
      applyCssVars(res.business.branding || DEFAULT_BRANDING, res.business.typography?.fontFamily);
    } catch {
      applyCssVars(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  return (
    <ThemeContext.Provider value={{ business, loading, refresh: load }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
