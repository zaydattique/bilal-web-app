'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

const KEY = 'cookie_consent_v1';
const CONSENT_EVENT = 'analytics-consent-changed';

export default function CookieConsent() {
  const { business } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const setConsent = (value: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* Analytics remains disabled when storage is unavailable. */
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We use browser storage for basic analytics and to improve the storefront.
          {business?.policies?.privacyUrl && (
            <> See our <a href={business.policies.privacyUrl} className="font-medium underline">privacy policy</a>.</>
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary" onClick={() => setConsent('declined')}>
            Not now
          </button>
          <button type="button" className="btn-primary" onClick={() => setConsent('accepted')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
