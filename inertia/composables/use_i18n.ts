import { usePage } from '@inertiajs/vue3'
import { IntlMessageFormat } from 'intl-messageformat'

type Messages = Record<string, string>

/**
 * The translation files of the server ("resources/lang/<locale>/<file>.json"),
 * flattened the same way as @adonisjs/i18n: "<file>.<nested.key>".
 */
const files = import.meta.glob<Record<string, unknown>>('../../resources/lang/*/*.json', {
  eager: true,
  import: 'default',
})

const FALLBACK_LOCALE = 'en'
const translations: Record<string, Messages> = {}

function flatten(value: unknown, prefix: string, output: Messages) {
  if (typeof value === 'string') {
    output[prefix] = value
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flatten(child, `${prefix}.${key}`, output)
  }
}

for (const [path, content] of Object.entries(files)) {
  const [locale, file] = path.split('/').slice(-2)
  flatten(content, file.replace(/\.json$/, ''), (translations[locale] ??= {}))
}

/**
 * Translates with the ICU message format, in the locale shared by the
 * Inertia middleware, so SSR and client render the same text.
 */
export function useI18n() {
  const page = usePage()

  function t(key: string, data?: Record<string, unknown>): string {
    const locale = page.props.locale
    const message = translations[locale]?.[key] ?? translations[FALLBACK_LOCALE]?.[key]
    if (message === undefined) {
      return key
    }
    return String(new IntlMessageFormat(message, locale).format(data))
  }

  return { t }
}
