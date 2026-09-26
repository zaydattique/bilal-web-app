'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function CustomerLoginPage() {
  const { requestOtp, verifyOtp } = useCustomerAuth();
  const { business } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [otp, setOtp] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await requestOtp(phoneNumber, cnic);
      setCustomerId(res.customerId);
      if (res.demoOtp) setDemoOtp(res.demoOtp);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(customerId, otp);
      router.push('/portal');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {(business?.businessName || 'C')[0]}
          </div>
          <h1 className="text-xl font-semibold">Customer Portal</h1>
          <p className="text-sm text-gray-500">{business?.businessName || 'My Accounts'}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number</label>
              <input
                className="input"
                required
                placeholder="03XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNIC</label>
              <input
                className="input"
                required
                placeholder="XXXXX-XXXXXXX-X"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {demoOtp && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Demo OTP: <strong className="font-mono">{demoOtp}</strong>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Enter OTP</label>
              <input
                className="input text-center text-lg tracking-widest"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button
              type="button"
              className="w-full text-sm text-gray-500 hover:underline"
              onClick={() => setStep('phone')}
            >
              ← Back
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
