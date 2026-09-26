import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CartProvider } from '@/context/CartContext';
import CookieConsent from '@/components/public/CookieConsent';
import JsonLd from '@/components/public/JsonLd';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Easy Monthly Installments | Electronics & Appliances Kot Khawaja Saeed Lahore',
    template: '%s | Installment Shop Lahore',
  },
  description:
    'Buy mobile phones, LED TVs, refrigerators, ACs and home appliances on easy monthly installments (qist) in Kot Khawaja Saeed, Lahore. Transparent plans, CNIC-based shop process.',
  keywords: [
    'installment shop Kot Khawaja Saeed',
    'easy monthly installments Lahore',
    'qiston pe electronics Lahore',
    'LED TV installment Lahore',
    'fridge on installments Kot Khawaja Saeed',
    'mobile phone qist Lahore',
    'home appliances installment Pakistan',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Installment Shop Lahore',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <AuthProvider>
          <CustomerAuthProvider>
            <ThemeProvider>
              <CartProvider>
                <JsonLd />
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
