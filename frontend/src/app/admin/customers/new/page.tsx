'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function NewCustomerPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    cnic: '',
    email: '',
    gender: '',
    street: '',
    city: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorCnic: '',
    guarantorRelation: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    setError('');
    try {
      await api.post(
        '/api/admin/customers',
        {
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          cnic: form.cnic,
          email: form.email || undefined,
          gender: form.gender || undefined,
          address: {
            street: form.street || undefined,
            city: form.city || undefined,
          },
          guarantor:
            form.guarantorName || form.guarantorPhone
              ? {
                  name: form.guarantorName || undefined,
                  phoneNumber: form.guarantorPhone || undefined,
                  cnic: form.guarantorCnic || undefined,
                  relationship: form.guarantorRelation || undefined,
                }
              : undefined,
        },
      );
      router.push('/admin/customers');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Customer</h1>
          <p className="text-sm text-gray-500">Register a customer with CNIC</p>
        </div>
        <Link href="/admin/customers" className="btn-secondary text-sm">
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700">Personal</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">First Name *</label>
              <input
                className="input"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last Name *</label>
              <input
                className="input"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone *</label>
              <input
                className="input"
                required
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNIC *</label>
              <input
                className="input"
                required
                placeholder="XXXXX-XXXXXXX-X"
                value={form.cnic}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Gender</label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700">Address</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Street</label>
              <input
                className="input"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700">Guarantor (optional)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className="input"
                value={form.guarantorName}
                onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                className="input"
                value={form.guarantorPhone}
                onChange={(e) => setForm({ ...form, guarantorPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNIC</label>
              <input
                className="input"
                value={form.guarantorCnic}
                onChange={(e) => setForm({ ...form, guarantorCnic: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Relationship</label>
              <input
                className="input"
                placeholder="e.g. Father, Brother"
                value={form.guarantorRelation}
                onChange={(e) => setForm({ ...form, guarantorRelation: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create Customer'}
        </button>
      </form>
    </div>
  );
}
