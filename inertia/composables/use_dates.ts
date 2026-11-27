import { usePage } from '@inertiajs/vue3'

/**
 * Units of a relative time ("3 days ago"), from the largest, with their
 * length in seconds.
 */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/**
 * Formats the UTC instants sent by the server, in the language and the
 * IANA time zone of the user (docs/architecture.md).
 */
export function useDates() {
  const page = usePage()

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat(page.props.locale, {
      dateStyle: 'medium',
      timeZone: page.props.timezone,
    }).format(new Date(iso))
  }

  function formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat(page.props.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: page.props.timezone,
    }).format(new Date(iso))
  }

  /**
   * "3 days ago", "in 2 hours": the largest unit that fits.
   */
  function formatRelative(iso: string): string {
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000
    const format = new Intl.RelativeTimeFormat(page.props.locale, { numeric: 'auto' })
    for (const [unit, length] of UNITS) {
      if (Math.abs(seconds) >= length) {
        return format.format(Math.round(seconds / length), unit)
      }
    }
    return format.format(0, 'minute')
  }

  return { formatDate, formatDateTime, formatRelative }
}
