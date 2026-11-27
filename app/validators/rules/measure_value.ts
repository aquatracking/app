import vine from '@vinejs/vine'
import type { MeasureTypeDefinition } from '#catalog/measure_types'

/**
 * A decimal number with a comma or a point as separator ("7,5", "7.5",
 * "-2", ".5").
 */
const DECIMAL = /^-?(\d+([.,]\d*)?|[.,]\d+)$/

/**
 * Number of a value entered with a comma or a point.
 */
export function parseMeasureValue(text: string) {
  return Number(text.replace(',', '.'))
}

/**
 * Number of decimals of an entered value, trailing zeros excluded: "25,30"
 * is 25,3.
 */
function decimalsOf(text: string) {
  const [, fraction = ''] = text.split(/[.,]/)
  return fraction.replace(/0+$/, '').length
}

type Options = {
  /**
   * Catalog entries the value may be of, by code.
   */
  measureTypes: (meta: any) => readonly MeasureTypeDefinition[]
}

/**
 * A value of a reading, keyed by the code of its measure type: a type
 * accepted by the reading, a number within its bounds of plausibility,
 * with at most its decimals (docs/features/05-tracked-measures.md). An
 * empty value is an empty field, ignored.
 */
export const measureValue = vine.createRule((value, options: Options, field) => {
  if (typeof value !== 'string' || value === '') {
    return
  }
  const type = options.measureTypes(field.meta).find((entry) => entry.code === String(field.name))
  if (!type) {
    field.report('The {{ field }} measure type is not part of this reading', 'measureType', field)
    return
  }
  if (!DECIMAL.test(value)) {
    field.report('The {{ field }} field must be a number', 'number', field)
    return
  }
  const number = parseMeasureValue(value)
  if (number < type.min || number > type.max) {
    field.report('The {{ field }} field must be between {{ min }} and {{ max }}', 'range', field, {
      min: type.min,
      max: type.max,
    })
    return
  }
  if (decimalsOf(value) > type.decimals) {
    field.report('The {{ field }} field has too many decimals', 'measureDecimals', field, {
      decimals: type.decimals,
    })
  }
})
