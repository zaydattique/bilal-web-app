'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Account {
  _id: string;
  accountNumber: string;
  remainingAmount: number;
  status: string;
  customerId?: { firstName: string; lastName: string; phoneNumber: string };
}

export default function NewPaymentPage() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const router = useRouter();
  const currency = business?.settings?.currencySymbol || 'PKR';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pendingKey = useRef({ fingerprint: '', key: '' });

  const [form, setForm] = useState({
    accountId: '',
    paymentAmount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (!admin) return;
    api
      .get<{ success: boolean; accounts: Account[] }>(
        '/api/admin/accounts?status=active&limit=100',
      )
      .then((res) => setAccounts(res.accounts))
      .catch(console.error);
  }, [admin]);

  const selected = accounts.find((a) => a._id === form.accountId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const requestFingerprint = JSON.stringify(form);
    if (pendingKey.current.fingerprint !== requestFingerprint) {
      pendingKey.current = { fingerprint: requestFingerprint, key: globalThis.crypto.randomUUID() };
    }
    try {
      const res = await api.post<{ success: boolean; payment: { receiptNumber: string } }>(
        '/api/admin/payments',
        {
          accountId: form.accountId,
          paymentAmount: Number(form.paymentAmount),
          paymentMethod: form.paymentMethod,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
          idempotencyKey: pendingKey.current.key,
        },
      );
      setSuccess(`Payment recorded. Receipt: ${res.payment.receiptNumber}`);
      setTimeout(() => router.push('/admin/payments'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Record Payment</h1>
          <p className="text-sm text-gray-500">Auto-allocates to oldest dues first</p>
        </div>
        <Link href="/admin/payments" className="btn-secondary text-sm">
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Account *</label>
          <select
            className="input"
            required
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">— Select active account —</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.accountNumber}
                {a.customerId
                  ? ` — ${a.customerId.firstName} ${a.customerId.lastName}`
                  : ''}{' '}
                (due: {currency} {a.remainingAmount.toLocaleString('en-PK')})
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-1 text-xs text-gray-500">
              Remaining:{' '}
              <strong>
                {currency} {selected.remainingAmount.toLocaleString('en-PK')}
              </strong>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Amount *</label>
          <input
            className="input"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={form.paymentAmount}
            onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Method</label>
          <select
            className="input"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Reference #</label>
          <input
            className="input"
            placeholder="Cheque / transaction ID"
            value={form.referenceNumber}
            onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            className="input min-h-[60px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Recording…' : 'Record Payment'}
        </button>
      </form>
    </div>
  );
}
