import { t } from '../i18n/lo.ts'

// Written by hand: browsers' Intl.RelativeTimeFormat has no Lao data and falls back to English.
const UNITS: [number, (n: number) => string][] = [
  [86_400_000, t.daysAgo],
  [3_600_000, t.hoursAgo],
  [60_000, t.minutesAgo],
]

/** "5 minutes ago" style text in Lao, e.g. for when a course was last studied. */
export function timeAgo(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp)
  for (const [ms, label] of UNITS) {
    if (diff >= ms) return label(Math.floor(diff / ms))
  }
  return t.justNow
}
