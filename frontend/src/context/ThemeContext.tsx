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
  socialMedia?: Record<string, string>;
  settings?: {
    currencySymbol?: string;
    currencyCode?: string;
    maxInstallments?: number;
    minDownPayment?: number;
    interestRate?: number;
  };
  seo?: { metaTitle?: string; metaDescription?: string };
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

const DEMO_BUSINESS: Business = {
  _id: '000000000000000000000001',
  businessName: 'Bilal Electronics',
  businessSlug: 'bilal-electronics',
  branding: DEFAULT_BRANDING,
  contact: {
    phone: '+92-300-1234567',
    email: 'info@bilalelectronics.pk',
    address: 'Shop area, Kot Khawaja Saeed',
    city: 'Lahore',
    whatsapp: '923001234567',
  },
  settings: {
    currencySymbol: 'PKR',
    currencyCode: 'PKR',
    maxInstallments: 24,
    minDownPayment: 10,
    interestRate: 0,
  },
  seo: {
    metaTitle: 'Easy Monthly Installments | Kot Khawaja Saeed Lahore',
    metaDescription:
      'Electronics and home appliances on easy monthly installments in Kot Khawaja Saeed, Lahore.',
  },
};

function applyCssVars(branding: Branding, fontFamily?: string) {
  if (typeof document === 'undefined') return;
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
  const [offline, setOffline] = useState(false);

  const load = async () => {
    const businessSlug = slug || process.env.NEXT_PUBLIC_BUSINESS_SLUG || 'bilal-electronics';
    try {
      const res = await api.get<{ success: boolean; business: Business }>(
        `/api/admin/business/public/${businessSlug}`
      );
      setBusiness(res.business);
      setOffline(false);
      applyCssVars(res.business.branding || DEFAULT_BRANDING, res.business.typography?.fontFamily);
    } catch {
      setBusiness({ ...DEMO_BUSINESS, businessSlug });
      setOffline(true);
      applyCssVars(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
