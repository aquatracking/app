import vine from '@vinejs/vine'

/**
 * Accepts an IANA time zone name ("Europe/Paris", "UTC"), as known by the
 * runtime. Fixed offsets ("+01:00"), which the runtime also understands,
 * are refused: they would ignore daylight saving time (docs/CONTEXT.md).
 *
 * The runtime fixes the case ("europe/paris" becomes "Europe/Paris"),
 * which is kept. It also renames some zones ("America/Montreal" becomes
 * "America/Toronto"), which the user did not choose: then the name is
 * kept as submitted.
 */
export const timezone = vine.createRule((value, _, field) => {
  if (typeof value !== 'string') {
    return
  }

  let resolvedName: string
  try {
    resolvedName = new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone
  } catch {
    field.report('The {{ field }} field must be a valid time zone', 'timezone', field)
    return
  }

  if (resolvedName.startsWith('+') || resolvedName.startsWith('-')) {
    field.report('The {{ field }} field must be a valid time zone', 'timezone', field)
    return
  }

  if (resolvedName.toLowerCase() === value.toLowerCase()) {
    field.mutate(resolvedName, field)
  }
})
