'use client';

import { FormEvent, useState } from 'react';
import api, { ApiError } from '@/lib/api';
import { trackCta } from '@/lib/analytics';
import { useTheme } from '@/context/ThemeContext';
import { TENURE_OPTIONS } from '@/lib/installmentLogic';

interface Props {
  productId?: string;
  productName?: string;
  preferredDownPayment?: number;
  preferredMonths?: number;
  onSuccess?: () => void;
}

export default function InquiryForm({
  productId,
  productName,
  preferredDownPayment,
  preferredMonths,
  onSuccess,
}: Props) {
  const { business } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [downPct, setDownPct] = useState(preferredDownPayment ?? 20);
  const maxMonths = business?.settings?.maxInstallments ?? 24;
  const tenureOptions = TENURE_OPTIONS.filter((months) => months <= maxMonths);
  const [months, setMonths] = useState(preferredMonths ?? (tenureOptions.includes(12 as never) ? 12 : tenureOptions[0] || 6));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const slug = business?.businessSlug || process.env.NEXT_PUBLIC_BUSINESS_SLUG;
      if (!slug) throw new Error('Business configuration is unavailable. Please try again later.');

      await api.post('/api/leads', {
        businessSlug: slug,
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim() || undefined,
        productId: productId || undefined,
        preferredDownPayment: downPct,
        notes: [
          productName ? `Product: ${productName}` : null,
          preferredMonths ? `Preferred tenure: ${preferredMonths} months` : null,
          `Preferred down payment: ${downPct}%`,
        ]
          .filter(Boolean)
          .join(' | '),
      });
      trackCta('inquiry_submit', 'Submit installment inquiry');
      setSuccess(true);
      setName('');
      setPhone('');
      setEmail('');
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to submit inquiry. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ background: 'var(--color-accent)' }}
        >
          ✓
        </div>
        <h3 className="text-lg font-semibold">Thank you!</h3>
        <p className="mt-1 text-sm text-gray-600">
          Your inquiry has been received. Our team will contact you shortly.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={() => setSuccess(false)}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Request Installment Plan</h3>
        <p className="text-sm text-gray-500">
          Fill in your details and we will get back to you.
          {productName ? ` Product: ${productName}` : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="inq-name">
          Full name *
        </label>
        <input
          id="inq-name"
          className="input"
          required
          autoComplete="name"
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="inq-phone">
          Phone number *
        </label>
        <input
          id="inq-phone"
          className="input"
          required
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03XXXXXXXXX"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="inq-email">
          Email (optional)
        </label>
        <input
          id="inq-email"
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="inq-tenure">Preferred tenure</label>
        <select
          id="inq-tenure"
          className="input"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          {tenureOptions.map((option) => (
            <option key={option} value={option}>{option} months</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <label htmlFor="inq-down">Preferred down payment</label>
          <span className="font-medium">{downPct}%</span>
        </div>
        <input
          id="inq-down"
          type="range"
          min={business?.settings?.minDownPayment ?? 10}
          max={80}
          step={5}
          value={downPct}
          onChange={(e) => setDownPct(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>

      <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit inquiry'}
      </button>
    </form>
  );
}
