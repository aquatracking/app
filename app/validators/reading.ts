import vine from '@vinejs/vine'
import type { DateTime } from 'luxon'
import type { MeasureTypeDefinition } from '#catalog/measure_types'
import { localDateTime, resolveLocalDateTime } from '#validators/rules/local_date_time'
import { measureValue, parseMeasureValue } from '#validators/rules/measure_value'

/**
 * Metadata of the reading validator: the time zone of the user, the
 * set-up date of the vivarium ("YYYY-MM-DD"), the instant of the edited
 * reading (null for a new one) and the catalog entries the reading
 * accepts (ReadingService.fieldTypes).
 */
type Meta = {
  timezone: string
  startedOn: string
  editedMeasuredAt: DateTime | null
  measureTypes: readonly MeasureTypeDefinition[]
}

/**
 * Refuses a reading without any value.
 */
const atLeastOneValue = vine.createRule((value, _, field) => {
  const values = Object.values((value ?? {}) as Record<string, unknown>)
  if (
    !values.some((entry) => entry !== null && entry !== undefined && String(entry).trim() !== '')
  ) {
    field.report('Enter at least one value', 'atLeastOneValue', field)
  }
})

/**
 * A reading, new or edited (docs/features/06-measures.md): its local date
 * and time, turned into an instant, and its values keyed by measure type
 * code, numbers or null for an empty field. Truncating to the minute is
 * left to ReadingService. An edited reading whose local date and time
 * are unchanged keeps its instant, even in the second occurrence of a
 * time repeated by the change to winter time.
 */
export const readingValidator = vine.withMetaData<Meta>().create({
  measuredAt: vine
    .string()
    .trim()
    .use(
      localDateTime({
        timezone: (meta: Meta) => meta.timezone,
        notBefore: (meta: Meta) => meta.startedOn,
        kept: (meta: Meta) => meta.editedMeasuredAt,
      })
    )
    .transform((value, field) => {
      const meta = field.meta as Meta
      return resolveLocalDateTime(value, meta.timezone, meta.editedMeasuredAt)!
    }),
  values: vine
    .record(
      vine
        .string()
        .trim()
        .use(measureValue({ measureTypes: (meta: Meta) => meta.measureTypes }))
        .transform((value) => (value ? parseMeasureValue(value) : null))
        .nullable()
    )
    .use(atLeastOneValue()),
})
