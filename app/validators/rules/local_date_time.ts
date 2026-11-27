import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * A local date and time as sent by a "datetime-local" field: minutes,
 * optionally seconds and fractions.
 */
const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/

/**
 * Instant of a local date and time in an IANA time zone, with the rules
 * of the zone on that date (docs/features/06-measures.md). Null when the
 * time does not exist there (skipped by the change to summer time). An
 * ambiguous time (repeated by the change to winter time) gives its first
 * occurrence, under the summer offset.
 *
 * Luxon moves a missing time forward and resolves an ambiguous one to
 * its second occurrence: each offset of the zone around the date is tried
 * instead, keeping those that give back the same local time.
 */
export function resolveLocalDateTime(text: string, zone: string): DateTime | null {
  if (!LOCAL_DATE_TIME.test(text)) {
    return null
  }
  const wallClock = DateTime.fromISO(text, { zone: 'utc' })
  if (!wallClock.isValid) {
    return null
  }
  const offsets = new Set(
    [-1, 1].map((days) => wallClock.plus({ days }).setZone(zone, { keepLocalTime: true }).offset)
  )
  const candidates = [...offsets]
    .map((offset) => wallClock.minus({ minutes: offset }).setZone(zone))
    .filter(
      (instant) =>
        instant.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS") ===
        wallClock.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")
    )
    .sort((a, b) => a.toMillis() - b.toMillis())
  return candidates[0]?.toUTC() ?? null
}

/**
 * Margin for a device clock slightly ahead of the server.
 */
const FUTURE_TOLERANCE = { minutes: 5 }

type Options = {
  /**
   * IANA time zone in which the date and time are entered.
   */
  timezone: (meta: any) => string
  /**
   * Earliest local date ("YYYY-MM-DD") accepted.
   */
  notBefore: (meta: any) => string
}

/**
 * A date and time entered in the time zone of the user: well formed,
 * existing in the zone, not in the future (5 minutes of tolerance) and
 * not before a local date. The instant itself is computed by
 * "resolveLocalDateTime".
 */
export const localDateTime = vine.createRule((value, options: Options, field) => {
  if (typeof value !== 'string') {
    return
  }
  const match = LOCAL_DATE_TIME.exec(value)
  if (!match || !DateTime.fromISO(value, { zone: 'utc' }).isValid) {
    field.report('The {{ field }} field must be a date and time', 'localDateTime', field)
    return
  }
  const instant = resolveLocalDateTime(value, options.timezone(field.meta))
  if (!instant) {
    field.report(
      'The {{ field }} field is a time that does not exist in this time zone',
      'localDateTime.nonexistent',
      field
    )
    return
  }
  if (instant > DateTime.now().plus(FUTURE_TOLERANCE)) {
    field.report('The {{ field }} field cannot be in the future', 'localDateTime.future', field)
    return
  }
  if (match[1] < options.notBefore(field.meta)) {
    field.report(
      'The {{ field }} field cannot be before the set-up date',
      'localDateTime.beforeStartedOn',
      field
    )
  }
})
