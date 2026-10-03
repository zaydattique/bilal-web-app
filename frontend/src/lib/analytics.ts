const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BUSINESS_SLUG = process.env.NEXT_PUBLIC_BUSINESS_SLUG;

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem('sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('sid', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

function send(payload: Record<string, unknown>) {
  if (typeof window === 'undefined' || !BUSINESS_SLUG) return;

  try {
    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, businessSlug: BUSINESS_SLUG }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Analytics must never break the storefront. */
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  send({
    type: 'page_view',
    path,
    sessionId: sessionId(),
    ts: Date.now(),
  });
}

export function trackCta(action: string, label?: string) {
  if (typeof window === 'undefined') return;
  send({
    type: 'cta_click',
    action,
    label: label || action,
    path: window.location.pathname,
    sessionId: sessionId(),
    ts: Date.now(),
  });
}
