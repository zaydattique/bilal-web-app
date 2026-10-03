const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BUSINESS_SLUG = process.env.NEXT_PUBLIC_BUSINESS_SLUG;
const CONSENT_KEY = 'cookie_consent_v1';

function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function sessionId(): string | null {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return null;
  try {
    let id = sessionStorage.getItem('analytics_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', id);
    }
    return id;
  } catch {
    return null;
  }
}

function send(payload: Record<string, unknown>) {
  if (typeof window === 'undefined' || !BUSINESS_SLUG || !hasAnalyticsConsent()) return;

  const sid = sessionId();
  if (!sid) return;

  try {
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        businessSlug: BUSINESS_SLUG,
        sessionId: sid,
        eventId: crypto.randomUUID(),
        referrer: document.referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Analytics must never break the storefront. */
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  send({ type: 'page_view', path });
}

export function trackCta(action: string, label?: string) {
  if (typeof window === 'undefined') return;
  send({
    type: 'cta_click',
    action,
    label: label || action,
    path: window.location.pathname,
  });
}
