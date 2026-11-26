import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'

const i18nConfig = defineConfig({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  formatter: formatters.icu(),

  /**
   * Translations live in "resources/lang/{en,fr}/*.json". The Vue pages
   * read the same files (inertia/composables/use_i18n.ts).
   */
  loaders: [
    loaders.fs({
      location: app.languageFilesPath(),
    }),
  ],
})

export default i18nConfig
