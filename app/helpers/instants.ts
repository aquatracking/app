import type { DateTime } from 'luxon'
import type { SeriesPoint } from '#services/measure_series_service'

/**
 * An instant as sent to the pages: ISO 8601 in UTC, without
 * milliseconds. The pages show it in the time zone of the user.
 */
export function iso(instant: DateTime) {
  return instant.toUTC().toISO({ suppressMilliseconds: true })!
}

/**
 * A point of a series as sent to the pages, its instant in UTC.
 */
export function point({ measuredAt, value }: SeriesPoint) {
  return { measuredAt: iso(measuredAt), value }
}
