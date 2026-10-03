'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  accountNumber: string;
}

interface InstallmentRow {
  dueDate: string;
  dueAmount: string;
}

export default function NewAccountPage() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const router = useRouter();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const maxInst = business?.settings?.maxInstallments || 12;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('0');
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { dueDate: '', dueAmount: '' },
  ]);

  useEffect(() => {
    if (!admin) return;
    api
      .get<{ success: boolean; customers: Customer[] }>('/api/admin/customers?limit=100')
      .then((res) => setCustomers(res.customers))
      .catch(console.error);
  }, [admin]);

  const remaining =
    (Number(totalAmount) || 0) - (Number(downPayment) || 0);
  const installmentSum = installments.reduce(
    (s, i) => s + (Number(i.dueAmount) || 0),
    0
  );

  const addRow = () => {
    if (installments.length >= maxInst) return;
    setInstallments([...installments, { dueDate: '', dueAmount: '' }]);
  };

  const removeRow = (idx: number) => {
    if (installments.length <= 1) return;
    setInstallments(installments.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof InstallmentRow, value: string) => {
    const next = [...installments];
    next[idx] = { ...next[idx], [field]: value };
    setInstallments(next);
  };

  /** Split remaining equally across N months starting next month */
  const autoSchedule = (count: number) => {
    const n = Math.min(Math.max(1, count), maxInst);
    const base = Math.floor((remaining / n) * 100) / 100;
    const rows: InstallmentRow[] = [];
    let allocated = 0;
    const start = new Date();
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);

    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      const amount =
        i === n - 1
          ? Math.round((remaining - allocated) * 100) / 100
          : base;
      allocated += amount;
      rows.push({
        dueDate: d.toISOString().slice(0, 10),
        dueAmount: String(amount),
      });
    }
    setInstallments(rows);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    setError('');

    if (!customerId) {
      setError('Select a customer');
      return;
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      setError('Enter a valid total amount');
      return;
    }
    if (Math.abs(installmentSum - remaining) > 1) {
      setError(
        `Installments sum (${installmentSum}) must equal remaining (${remaining})`
      );
      return;
    }
    for (const row of installments) {
      if (!row.dueDate || !row.dueAmount) {
        setError('Every installment needs a date and amount');
        return;
      }
    }

    setSaving(true);
    try {
      await api.post(
        '/api/admin/accounts',
        {
          customerId,
          totalAmount: Number(totalAmount),
          downPayment: Number(downPayment) || 0,
          installments: installments.map((i) => ({
            dueDate: i.dueDate,
            dueAmount: Number(i.dueAmount),
          })),
        },
        token
      );
      router.push('/admin/accounts');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Installment Account</h1>
          <p className="text-sm text-gray-500">Flexible schedule — any dates & amounts</p>
        </div>
        <Link href="/admin/accounts" className="btn-secondary text-sm">
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Customer *</label>
          <select
            className="input"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.firstName} {c.lastName} ({c.phoneNumber}) — {c.accountNumber}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No customers.{' '}
              <Link href="/admin/customers/new" className="underline">
                Add one first
              </Link>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Total Amount *</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              required
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Down Payment</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          Remaining to schedule:{' '}
          <strong>
            {currency} {remaining.toLocaleString('en-PK')}
          </strong>
          {' · '}Scheduled sum:{' '}
          <strong
            className={
              Math.abs(installmentSum - remaining) > 1 ? 'text-red-600' : 'text-green-700'
            }
          >
            {currency} {installmentSum.toLocaleString('en-PK')}
          </strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Quick schedule:</span>
          {[3, 6, 9, 12].filter((n) => n <= maxInst).map((n) => (
            <button
              key={n}
              type="button"
              className="btn-secondary text-xs"
              onClick={() => autoSchedule(n)}
              disabled={remaining <= 0}
            >
              {n} months
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Installments</h3>
            <button type="button" className="btn-secondary text-xs" onClick={addRow}>
              + Add row
            </button>
          </div>
          {installments.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="mb-1 block text-xs text-gray-500">#{idx + 1} Due date</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={row.dueDate}
                  onChange={(e) => updateRow(idx, 'dueDate', e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="mb-1 block text-xs text-gray-500">Amount</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={row.dueAmount}
                  onChange={(e) => updateRow(idx, 'dueAmount', e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-secondary text-xs mb-0.5"
                onClick={() => removeRow(idx)}
                disabled={installments.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
