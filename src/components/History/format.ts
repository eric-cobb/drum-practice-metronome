/** "1h 20m" / "5m 3s" / "12s". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Compact delta like "+38m" / "-12m" / "±0". Input in seconds. */
export function formatDelta(seconds: number): string {
  if (seconds === 0) return '±0';
  const sign = seconds > 0 ? '+' : '−';
  return `${sign}${formatDuration(Math.abs(seconds))}`;
}

/** Absolute timestamp, medium date + short time. */
export function formatExact(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Coarse relative time: "just now", "5m ago", "2h ago", "3d ago", else date. */
export function formatRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
