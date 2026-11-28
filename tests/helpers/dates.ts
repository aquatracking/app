import { DateTime } from 'luxon'

/**
 * UTC instant the given number of days ago, truncated to the minute
 * ("2026-11-21T10:42:00Z").
 */
export function daysAgo(days: number) {
  return DateTime.utc().minus({ days }).startOf('minute').toISO({ suppressMilliseconds: true })!
}
