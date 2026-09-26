import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'Installment Sales Platform',
  description: 'White-label B2B installment sales platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <CustomerAuthProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
