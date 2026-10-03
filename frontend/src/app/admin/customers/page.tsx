'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Customer {
  _id: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  cnic: string;
  status: string;
  totalAccounts: number;
  totalDue: number;
}

export default function CustomersPage() {
  const { admin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!admin) return;
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    api
      .get<{ success: boolean; customers: Customer[] }>(`/api/admin/customers?${q}`)
      .then((res) => setCustomers(res.customers))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [admin]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input w-56"
            placeholder="Search name, phone, CNIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button className="btn-secondary" onClick={load}>
            Search
          </button>
          <Link href="/admin/customers/new" className="btn-primary text-sm">
            + Add Customer
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Account #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">CNIC</th>
                <th className="px-4 py-3">Accounts</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.accountNumber}</td>
                  <td className="px-4 py-3 font-medium">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3">{c.phoneNumber}</td>
                  <td className="px-4 py-3">{c.cnic}</td>
                  <td className="px-4 py-3">{c.totalAccounts}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No customers yet.{' '}
                    <Link href="/admin/customers/new" className="underline" style={{ color: 'var(--color-primary)' }}>
                      Add one
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
