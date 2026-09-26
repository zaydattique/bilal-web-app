'use client';

import { useMemo, useState } from 'react';
import {
  TENURE_OPTIONS,
  calculateInstallment,
  formatPKR,
} from '@/lib/installmentLogic';
import { useTheme } from '@/context/ThemeContext';
import { trackCta } from '@/lib/analytics';

interface Props {
  price: number;
  productName?: string;
  onInquiry?: (downPaymentPercent: number, months: number) => void;
}

export default function InstallmentCalculator({ price, productName, onInquiry }: Props) {
  const { business } = useTheme();
  const symbol = business?.settings?.currencySymbol || 'PKR';
  const minDown = business?.settings?.minDownPayment ?? 10;
  const maxMonths = business?.settings?.maxInstallments ?? 24;
  const annualRate = 0;

  const tenureOptions = TENURE_OPTIONS.filter((m) => m <= maxMonths);
  const [downPct, setDownPct] = useState(Math.max(minDown, 20));
  const [months, setMonths] = useState(tenureOptions.includes(12 as never) ? 12 : tenureOptions[0] || 6);

  const result = useMemo(
    () =>
      calculateInstallment({
        price,
        downPaymentPercent: downPct,
        months,
        annualInterestRate: annualRate,
      }),
    [price, downPct, months, annualRate]
  );

  return (
    <div className="card space-y-5 p-4 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold">Installment Calculator</h3>
        {productName && (
          <p className="text-sm text-gray-500">{productName}</p>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <label htmlFor="down-pct">Down payment</label>
          <span className="font-medium">{downPct}%</span>
        </div>
        <input
          id="down-pct"
          type="range"
          min={minDown}
          max={80}
          step={5}
          value={downPct}
          onChange={(e) => setDownPct(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>Min {minDown}%</span>
          <span>80%</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm">Tenure (months)</label>
        <div className="flex flex-wrap gap-2">
          {tenureOptions.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                months === m
                  ? 'border-transparent text-white'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={
                months === m
                  ? { background: 'var(--color-primary)' }
                  : undefined
              }
            >
              {m} mo
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Product price</span>
          <span className="font-medium">{formatPKR(result.productPrice, symbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Down payment ({result.downPaymentPercent}%)</span>
          <span className="font-medium">{formatPKR(result.downPaymentAmount, symbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Amount financed</span>
          <span className="font-medium">{formatPKR(result.financedAmount, symbol)}</span>
        </div>
        {result.totalInterest > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Interest</span>
            <span className="font-medium">{formatPKR(result.totalInterest, symbol)}</span>
          </div>
        )}
        <div
          className="flex justify-between border-t pt-2 text-base font-bold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
        >
          <span>Monthly payment</span>
          <span>{formatPKR(result.monthlyPayment, symbol)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Total payable</span>
          <span>{formatPKR(result.totalPayable, symbol)}</span>
        </div>
      </div>

      {onInquiry && (
        <button
          type="button"
          className="btn-primary w-full py-2.5"
          onClick={() => { trackCta('request_plan', 'Request this plan'); onInquiry(downPct, months); }}
        >
          Request this plan
        </button>
      )}
    </div>
  );
}
