'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

const CONSENT_KEY = 'cookie_consent_v1';
const CONSENT_EVENT = 'analytics-consent-changed';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const track = () => {
      if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return;
      if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/portal') || lastPath.current === pathname) return;
      lastPath.current = pathname;
      trackPageView(pathname);
    };

    track();
    window.addEventListener(CONSENT_EVENT, track);
    return () => window.removeEventListener(CONSENT_EVENT, track);
  }, [pathname]);

  return null;
}
