/**
 * Zone designated by a time zone name, as named by the runtime, or null
 * when the runtime does not know the name.
 */
function zoneOf(name: string): string | null {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: name }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

/**
 * Name of the list of time zones (sent by the server) that designates the
 * same zone as the given name, or null. The browser and the server may
 * name a zone differently ("Asia/Kolkata" and "Asia/Calcutta").
 */
export function listedTimezone(name: string, timezones: readonly string[]): string | null {
  if (timezones.includes(name)) {
    return name
  }
  const zone = zoneOf(name)
  if (!zone) {
    return null
  }
  return timezones.find((listed) => zoneOf(listed) === zone) ?? null
}

/**
 * Time zone of the browser, as a name of the list, or null when the
 * browser gives none or one that is not in the list. Only known once
 * mounted: the server renders without it.
 */
export function browserTimezone(timezones: readonly string[]): string | null {
  const name = Intl.DateTimeFormat().resolvedOptions().timeZone
  return name ? listedTimezone(name, timezones) : null
}
