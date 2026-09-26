export function formatCurrency(amount: number, symbol = 'PKR'): string {
  return `${symbol} ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function truncate(str: string, len = 80): string {
  if (!str) return '';
  return str.length <= len ? str : `${str.slice(0, len)}…`;
}
