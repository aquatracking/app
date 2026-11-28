import vine from '@vinejs/vine'
import { TIMEZONES } from '#catalog/timezones'

/**
 * Names of the list of time zones, by their lowercase form.
 */
const timezonesByLowerCase = new Map(TIMEZONES.map((name) => [name.toLowerCase(), name]))

/**
 * Accepts a name of the list of time zones (docs/CONTEXT.md), whatever its
 * case: "europe/paris" is saved as "Europe/Paris". Any other name is
 * refused, even one the runtime understands: fixed offsets ("+01:00",
 * "Etc/GMT+5") and abbreviations ("EST") would ignore daylight saving time.
 */
export const timezone = vine.createRule((value, _, field) => {
  if (typeof value !== 'string') {
    return
  }

  const name = timezonesByLowerCase.get(value.toLowerCase())
  if (!name) {
    field.report('The {{ field }} field must be a valid time zone', 'timezone', field)
    return
  }

  field.mutate(name, field)
})
