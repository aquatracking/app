import { usePage } from '@inertiajs/vue3'
import { useNow } from '~/composables/use_now'

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
  const now = useNow()

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
   * "3 days ago", "in 2 hours": the largest unit that fits, from now
   * (useNow): the server rendering and the hydration agree, then it
   * follows the clock of the browser.
   */
  function formatRelative(iso: string): string {
    const seconds = (Date.parse(iso) - now.value) / 1000
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
