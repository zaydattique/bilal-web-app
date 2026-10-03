'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  accountNumber: string;
  businessId: string;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  loading: boolean;
  requestOtp: (phoneNumber: string, cnic: string, businessSlug?: string) => Promise<{ customerId: string; demoOtp?: string }>;
  verifyOtp: (customerId: string, otp: string) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/customer/logout', {});
    } catch {
      // The server may already have expired/revoked the session.
    }
    setCustomer(null);
  }, []);

  useEffect(() => {
    api
      .get<{ success: boolean; customer: Customer }>('/api/auth/customer/me')
      .then((res) => {
        const c = res.customer as Customer & { _id?: string };
        setCustomer({
          id: c.id || c._id || '',
          firstName: c.firstName,
          lastName: c.lastName,
          phoneNumber: c.phoneNumber,
          accountNumber: c.accountNumber,
          businessId: c.businessId,
        });
      })
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, []);

  const requestOtp = async (phoneNumber: string, cnic: string, businessSlug?: string) => {
    const res = await api.post<{
      success: boolean;
      customerId: string;
      demoOtp?: string;
      message: string;
    }>('/api/auth/customer/login', {
      phoneNumber,
      cnic,
      businessSlug: businessSlug || process.env.NEXT_PUBLIC_BUSINESS_SLUG,
    });
    return { customerId: res.customerId, demoOtp: res.demoOtp };
  };

  const verifyOtp = async (customerId: string, otp: string) => {
    const res = await api.post<{ success: boolean; customer: Customer }>(
      '/api/auth/customer/verify-otp',
      { customerId, otp }
    );
    setCustomer(res.customer);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
