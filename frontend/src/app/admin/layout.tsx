'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (!loading && !token && !isLogin) {
      router.replace('/admin/login');
    }
    if (!loading && token && isLogin) {
      router.replace('/admin');
    }
  }, [loading, token, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
