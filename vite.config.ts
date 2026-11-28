import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    adonisjs({
      entryPoints: ['inertia/app.ts'],
      serverEntryPoints: ['inertia/ssr.ts'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
    },
  },

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          /**
           * One chunk per language for the translations, loaded on demand
           * (inertia/composables/use_i18n.ts).
           */
          groups: [
            {
              name: (id) => {
                const locale = /\/resources\/lang\/([a-z]+)\//.exec(id)?.[1]
                return locale ? `lang-${locale}` : null
              },
            },
          ],
        },
      },
    },
  },

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
