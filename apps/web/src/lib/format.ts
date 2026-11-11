const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}
