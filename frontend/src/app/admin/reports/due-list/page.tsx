'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import { buildOverdueWhatsAppUrl } from '@/lib/whatsapp';

interface DueRow {
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  remaining: number;
  status: string;
  installmentNumber: number;
  accountNumber: string;
  accountId: string;
  customerName: string;
  phone: string;
  customerId: string;
  isOverdue: boolean;
}

export default function DueListReport() {
  const { admin } = useAuth();
  const { business } = useTheme();
  const currency = business?.settings?.currencySymbol || 'PKR';
  const businessName = business?.businessName || 'our store';

  const [filter, setFilter] = useState<'overdue' | 'upcoming' | 'all'>('overdue');
  const [dues, setDues] = useState<DueRow[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    api
      .get<{ success: boolean; dues: DueRow[]; totalDue: number }>(
        `/api/admin/reports/due-list?filter=${filter}`,
      )
      .then((res) => {
        setDues(res.dues);
        setTotalDue(res.totalDue);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [admin, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">
            ← Reports
          </Link>
          <h1 className="text-2xl font-bold">Late / Due Installments</h1>
          <p className="text-sm text-gray-500">
            Total: {currency} {totalDue.toLocaleString('en-PK')} · {dues.length} rows
          </p>
        </div>
        <div className="flex gap-2">
          {(['overdue', 'upcoming', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                filter === f ? 'text-white' : 'btn-secondary'
              }`}
              style={filter === f ? { background: 'var(--color-primary)' } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dues.map((d, i) => {
                const overdue = d.isOverdue || d.status === 'overdue';
                const waUrl =
                  d.phone &&
                  buildOverdueWhatsAppUrl({
                    phone: d.phone,
                    customerName: d.customerName,
                    accountNumber: d.accountNumber,
                    dueAmount: d.remaining,
                    dueDate: d.dueDate,
                    businessName,
                    currency,
                  });

                return (
                  <tr key={i} className={overdue ? 'bg-red-50/50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.customerName}</div>
                      <div className="text-xs text-gray-400">{d.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.accountNumber}</td>
                    <td className="px-4 py-3">{d.installmentNumber}</td>
                    <td className="px-4 py-3">
                      {new Date(d.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {currency} {d.remaining.toLocaleString('en-PK')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          overdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {overdue ? 'overdue' : d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                          style={{ background: '#25D366' }}
                          title="Open WhatsApp with reminder message"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No phone</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {dues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No dues for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        WhatsApp opens chat with a pre-filled reminder (name, account, amount, due date).
        Phone numbers are normalized for Pakistan (+92).
      </p>
    </div>
  );
}
