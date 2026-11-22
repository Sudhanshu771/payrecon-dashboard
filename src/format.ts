// Small display helpers shared by all pages

export function formatMoney(amount: number | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined) return '–';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function shortId(id: string | null | undefined): string {
  return id ? `${id.slice(0, 8)}…` : '–';
}
