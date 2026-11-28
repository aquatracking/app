import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import type { FieldContext } from '@vinejs/vine/types'
import {
  CLIMATES,
  VIVARIUM_KINDS,
  WATER_TYPES,
  hasClimate,
  hasWaterType,
  type VivariumKind,
} from '#models/vivarium'

/**
 * Metadata of the vivarium validators: the time zone of the user, whose
 * local date is "today", and on update the kind of the vivarium, which
 * cannot change, its stored set-up date ("YYYY-MM-DD") and the local date
 * of its oldest reading, with its label in the language of the user (none
 * without reading).
 */
type Meta = {
  timezone: string
  kind?: VivariumKind
  startedOn?: string
  firstReading?: { date: string; label: string } | null
}

/**
 * Kind of the vivarium being validated: the submitted one on creation,
 * the stored one on update.
 */
function kindOf(field: FieldContext): VivariumKind {
  return (field.meta as Meta).kind ?? field.parent.kind
}

/**
 * Refuses a water type or a climate that the kind of vivarium does not
 * have ("vivariums_profile_check"): a terrarium with a water type, an
 * aquarium with a climate.
 */
const allowedByKind = vine.createRule((_, allowed: (kind: VivariumKind) => boolean, field) => {
  if (!allowed(kindOf(field))) {
    field.report('The {{ field }} field is not allowed for this kind', 'allowedByKind', field)
  }
})

/**
 * Refuses moving the set-up date after the local date of the oldest
 * reading: no reading is before the set-up (docs/features/06-measures.md).
 * An unchanged date is accepted: the local date of the oldest reading
 * moves back a day when the user changes time zone.
 */
const notAfterFirstReading = vine.createRule((value, _, field) => {
  const { firstReading, startedOn } = field.meta as Meta
  /**
   * A Luxon date (start/validator.ts), at midnight in the zone of the
   * process, where VineJS parses it.
   */
  if (!DateTime.isDateTime(value) || !firstReading || value.toISODate() === startedOn) {
    return
  }
  if (value.toISODate()! > firstReading.date) {
    field.report(
      'The {{ field }} field cannot be after the first reading',
      'notAfterFirstReading',
      field,
      { date: firstReading.label }
    )
  }
})

const dimension = () => vine.number().withoutDecimals().range([1, 1000]).nullable()

/**
 * Fields of the form shared by creation and update. The kind is only
 * submitted on creation.
 */
const fields = {
  name: vine.string().trim().minLength(1).maxLength(100),
  description: vine.string().trim().maxLength(2000).nullable(),
  waterType: vine
    .enum(WATER_TYPES)
    .optional()
    .requiredWhen((field) => hasWaterType(kindOf(field)))
    .use(allowedByKind(hasWaterType)),
  climate: vine
    .enum(CLIMATES)
    .optional()
    .requiredWhen((field) => hasClimate(kindOf(field)))
    .use(allowedByKind(hasClimate)),
  lengthCm: dimension(),
  widthCm: dimension(),
  heightCm: dimension(),
  volumeLiters: vine.number().positive().decimal([0, 1]).max(999999.9).nullable(),
  /**
   * Not after today, in the time zone of the user.
   */
  startedOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .beforeOrEqual((field) =>
      DateTime.now()
        .setZone((field.meta as Meta).timezone)
        .toISODate()!
    )
    .use(notAfterFirstReading()),
}

export const createVivariumValidator = vine.withMetaData<Meta>().create({
  kind: vine.enum(VIVARIUM_KINDS),
  ...fields,
})

/**
 * The kind cannot change: it is not part of the validator, so a
 * submitted kind is dropped. The set-up date cannot move after the oldest
 * reading.
 */
export const updateVivariumValidator = vine
  .withMetaData<
    Meta & { kind: VivariumKind; startedOn: string; firstReading: Meta['firstReading'] }
  >()
  .create(fields)

/**
 * JPEG, PNG or WebP image of 15 MB at most (docs/features/04-vivariums.md).
 */
export const updateVivariumImageValidator = vine.create({
  image: vine.file({ size: '15mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }),
})
