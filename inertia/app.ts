import './css/app.css'
import 'vue-sonner/style.css'
import { title } from '~/title'
import { client } from '~/client'
import { createInertiaApp } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { loadTranslations } from '~/composables/use_i18n'
import { createSSRApp, type DefineComponent, h } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

createInertiaApp({
  title,
  resolve: async (name, page) => {
    const [component] = await Promise.all([
      resolvePageComponent(
        `./pages/${name}.vue`,
        import.meta.glob<DefineComponent>('./pages/**/*.vue')
      ),
      page && loadTranslations(page.props.locale),
    ])
    return component
  },
  setup({ el, App, props, plugin }) {
    createSSRApp({ render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }) })
      .use(plugin)
      .mount(el)
  },
})
