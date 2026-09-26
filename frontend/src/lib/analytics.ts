const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem('sid');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('sid', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  const payload = {
    type: 'page_view',
    path,
    sessionId: sessionId(),
    businessSlug: process.env.NEXT_PUBLIC_BUSINESS_SLUG || 'bilal-electronics',
    ts: Date.now(),
  };
  try {
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function trackCta(action: string, label?: string) {
  if (typeof window === 'undefined') return;
  const payload = {
    type: 'cta_click',
    action,
    label: label || action,
    path: window.location.pathname,
    sessionId: sessionId(),
    businessSlug: process.env.NEXT_PUBLIC_BUSINESS_SLUG || 'bilal-electronics',
    ts: Date.now(),
  };
  try {
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
