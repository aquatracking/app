import { usePage } from '@inertiajs/vue3'
import { useI18n } from '~/composables/use_i18n'

export type VivariumKind = 'aquarium' | 'terrarium' | 'paludarium'

/**
 * Whether a kind of vivarium has a water type and a climate, as checked
 * by the server (app/models/vivarium.ts).
 */
export function hasWaterType(kind: VivariumKind) {
  return kind !== 'terrarium'
}

export function hasClimate(kind: VivariumKind) {
  return kind !== 'aquarium'
}

/**
 * Today's date ("YYYY-MM-DD") in the time zone of the user.
 */
function todayIn(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

/**
 * Labels of a vivarium: its profile ("Aquarium · saltwater") and its age
 * ("2 years old"), in the language and time zone of the user.
 */
export function useVivarium() {
  const { t } = useI18n()
  const page = usePage()

  function profileLabel(vivarium: {
    kind: VivariumKind
    waterType: string | null
    climate: string | null
  }) {
    return [
      t(`vivariums.kinds.${vivarium.kind}`),
      vivarium.waterType && t(`vivariums.water_types.${vivarium.waterType}`),
      vivarium.climate && t(`vivariums.climates.${vivarium.climate}`),
    ]
      .filter(Boolean)
      .join(' · ')
  }

  /**
   * Age from the set-up date, in the largest whole unit: years, months
   * or days, counted on calendar dates.
   */
  function ageLabel(startedOn: string) {
    const [fromYear, fromMonth, fromDay] = startedOn.split('-').map(Number)
    const [toYear, toMonth, toDay] = todayIn(page.props.timezone).split('-').map(Number)

    let months = (toYear - fromYear) * 12 + (toMonth - fromMonth)
    if (toDay < fromDay) months -= 1
    const days = Math.round(
      (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
        86_400_000
    )

    const [value, unit] =
      months >= 12
        ? [Math.floor(months / 12), 'year']
        : months >= 1
          ? [months, 'month']
          : [days, 'day']
    if (value <= 0) {
      return t('vivariums.age_today')
    }
    const duration = new Intl.NumberFormat(page.props.locale, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
    }).format(value)
    return t('vivariums.age', { duration })
  }

  function volumeLabel(volumeLiters: number) {
    return t('vivariums.volume', { volume: volumeLiters })
  }

  return { profileLabel, ageLabel, volumeLabel }
}
