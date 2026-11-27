import { usePage } from '@inertiajs/vue3'
import { useI18n } from '~/composables/use_i18n'

/**
 * Formatting of the values and labels of measures, in the language and
 * time zone of the user (docs/features/06-measures.md).
 */
export function useMeasures() {
  const page = usePage()
  const { t } = useI18n()

  function typeLabel(measureType: { code: string }) {
    return t(`measure_types.${measureType.code}.label`)
  }

  /**
   * A value as entered, without forced trailing zeros, at most with the
   * decimals of its type: "7,25" in French, "7.25" in English.
   */
  function formatValue(value: number, decimals: number) {
    return new Intl.NumberFormat(page.props.locale, { maximumFractionDigits: decimals }).format(
      value
    )
  }

  /**
   * A value to put back in a field of the form: no thousands separator,
   * the decimal separator of the language, accepted by the server.
   */
  function inputValue(value: number, decimals: number) {
    return new Intl.NumberFormat(page.props.locale, {
      maximumFractionDigits: decimals,
      useGrouping: false,
    }).format(value)
  }

  /**
   * Now, to the minute, in the time zone of the user, as a
   * "datetime-local" field expects it ("2026-11-26T18:42").
   */
  function localNow() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: page.props.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date())
        .map(({ type, value }) => [type, value])
    )
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  }

  return { typeLabel, formatValue, inputValue, localNow }
}
