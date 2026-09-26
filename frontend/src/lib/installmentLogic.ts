/**
 * Simple installment calculator (China Corporation style).
 * Defaults to 0% interest when rate is not provided.
 */

export interface InstallmentInput {
  price: number;
  downPaymentPercent: number;
  months: number;
  annualInterestRate?: number;
}

export interface InstallmentResult {
  productPrice: number;
  downPaymentAmount: number;
  financedAmount: number;
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
  months: number;
  downPaymentPercent: number;
}

export const TENURE_OPTIONS = [6, 12, 18, 24] as const;

export function calculateInstallment(input: InstallmentInput): InstallmentResult {
  const price = Math.max(0, Number(input.price) || 0);
  const downPct = Math.min(100, Math.max(0, Number(input.downPaymentPercent) || 0));
  const months = Math.max(1, Math.floor(Number(input.months) || 1));
  const annualRate = Math.max(0, Number(input.annualInterestRate) || 0);

  const downPaymentAmount = Math.round((price * downPct) / 100);
  const financedAmount = Math.max(0, price - downPaymentAmount);

  const totalInterest =
    annualRate > 0
      ? Math.round(financedAmount * (annualRate / 100) * (months / 12))
      : 0;

  const totalFinancedWithInterest = financedAmount + totalInterest;
  const monthlyPayment =
    months > 0 ? Math.ceil(totalFinancedWithInterest / months) : totalFinancedWithInterest;

  const totalPayable = downPaymentAmount + monthlyPayment * months;

  return {
    productPrice: price,
    downPaymentAmount,
    financedAmount,
    monthlyPayment,
    totalPayable,
    totalInterest,
    months,
    downPaymentPercent: downPct,
  };
}

export function formatPKR(amount: number, symbol = 'PKR'): string {
  return `${symbol} ${Math.round(amount).toLocaleString('en-PK')}`;
}
