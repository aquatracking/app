import { usePage } from '@inertiajs/vue3'
import { IntlMessageFormat } from 'intl-messageformat'

type Messages = Record<string, string>

/**
 * The translation files of the server ("resources/lang/<locale>/<file>.json"),
 * loaded on demand, one chunk per language (vite.config.ts). The emails
 * are only sent by the server.
 */
const files = import.meta.glob<Record<string, unknown>>(
  ['../../resources/lang/*/*.json', '!../../resources/lang/*/emails.json'],
  { import: 'default' }
)

/**
 * Messages of the loaded languages, flattened the same way as
 * @adonisjs/i18n: "<file>.<nested.key>".
 */
const translations: Record<string, Messages> = {}
const loading: Record<string, Promise<void>> = {}

function flatten(value: unknown, prefix: string, output: Messages) {
  if (typeof value === 'string') {
    output[prefix] = value
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flatten(child, `${prefix}.${key}`, output)
  }
}

/**
 * Loads the translations of a language, once. Called before rendering
 * each page (inertia/app.ts, inertia/ssr.ts), with the language of its
 * props: the page never renders before its texts are there, and changing
 * language loads the new one on the next page.
 */
export function loadTranslations(locale: string) {
  loading[locale] ??= (async () => {
    const messages: Messages = {}
    await Promise.all(
      Object.entries(files).map(async ([path, load]) => {
        const [fileLocale, file] = path.split('/').slice(-2)
        if (fileLocale === locale) {
          flatten(await load(), file.replace(/\.json$/, ''), messages)
        }
      })
    )
    translations[locale] = messages
  })()
  return loading[locale]
}

/**
 * Translates with the ICU message format, in the locale shared by the
 * Inertia middleware, so SSR and client render the same text. Only that
 * language is loaded: the files of both languages have the same keys
 * (AGENTS.md), and a missing key shows as is.
 */
export function useI18n() {
  const page = usePage()

  function t(key: string, data?: Record<string, unknown>): string {
    const locale = page.props.locale
    const message = translations[locale]?.[key]
    if (message === undefined) {
      return key
    }
    return String(new IntlMessageFormat(message, locale).format(data))
  }

  return { t }
}
