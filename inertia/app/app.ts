/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { createInertiaApp } from '@inertiajs/vue3'
import { updatePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'
import type { DefineComponent } from 'vue'
import { createApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import '../css/app.css'

import en from '../../resources/lang/en.json'
import fr from '../../resources/lang/fr.json'

const appName = import.meta.env.VITE_APP_NAME || 'Aquatracking'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(
      `../pages/${name}.vue`,
      import.meta.glob<DefineComponent>('../pages/**/*.vue')
    )
  },

  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(PrimeVue, {
        theme: {
          preset: Aura,
        },
      })
      .use(
        createI18n({
          legacy: false,
          messages: {
            en,
            fr,
          },
          locale: 'fr',
          fallbackLocale: 'en',
        })
      )
      .mount(el)

    updatePreset({
      semantic: {
        primary: {
          50: '{cyan.50}',
          100: '{cyan.100}',
          200: '{cyan.200}',
          300: '{cyan.300}',
          400: '{cyan.400}',
          500: '{cyan.500}',
          600: '{cyan.600}',
          700: '{cyan.700}',
          800: '{cyan.800}',
          900: '{cyan.900}',
          950: '{cyan.950}',
        },
      },
    })
  },
})
