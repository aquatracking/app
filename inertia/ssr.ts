import { title } from '~/title'
import { client } from '~/client'
import { createInertiaApp } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { renderToString } from '@vue/server-renderer'
import { loadTranslations } from '~/composables/use_i18n'
import { createSSRApp, h, type DefineComponent } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

export default function render(page: any) {
  return createInertiaApp({
    page,
    title,
    render: renderToString,
    resolve: async (name, resolvedPage) => {
      const [component] = await Promise.all([
        resolvePageComponent(
          `./pages/${name}.vue`,
          import.meta.glob<DefineComponent>('./pages/**/*.vue', { eager: true })
        ),
        resolvedPage && loadTranslations(resolvedPage.props.locale),
      ])
      return component
    },
    setup: ({ App, props, plugin }) => {
      return createSSRApp({
        render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }),
      }).use(plugin)
    },
  })
}
