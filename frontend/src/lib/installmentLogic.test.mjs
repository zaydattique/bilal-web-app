import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInstallment, formatPKR, TENURE_OPTIONS } from './installmentLogic.ts';

test('installment calculator handles zero-interest plans', () => {
  const result = calculateInstallment({ price: 120000, downPaymentPercent: 25, months: 12, annualInterestRate: 0 });
  assert.equal(result.downPaymentAmount, 30000);
  assert.equal(result.financedAmount, 90000);
  assert.equal(result.monthlyPayment, 7500);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPayable, 120000);
});

test('installment calculator clamps unsafe percentages and months', () => {
  const result = calculateInstallment({ price: 100000, downPaymentPercent: 150, months: 0, annualInterestRate: -5 });
  assert.equal(result.downPaymentPercent, 100);
  assert.equal(result.financedAmount, 0);
  assert.equal(result.months, 1);
  assert.equal(result.totalInterest, 0);
});

test('installment calculator applies simple annual interest to financed amount', () => {
  const result = calculateInstallment({ price: 100000, downPaymentPercent: 20, months: 12, annualInterestRate: 12 });
  assert.equal(result.downPaymentAmount, 20000);
  assert.equal(result.financedAmount, 80000);
  assert.equal(result.totalInterest, 9600);
  assert.equal(result.monthlyPayment, 7467);
  assert.equal(result.totalPayable, 109604);
});

test('tenure options and currency formatting remain canonical', () => {
  assert.deepEqual(TENURE_OPTIONS, [6, 12, 18, 24]);
  assert.equal(formatPKR(123456.7), 'PKR 123,457');
});
