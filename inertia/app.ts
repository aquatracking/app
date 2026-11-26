import './css/app.css'
import 'vue-sonner/style.css'
import { title } from '~/title'
import { client } from '~/client'
import { createInertiaApp } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createSSRApp, type DefineComponent, h } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

createInertiaApp({
  title,
  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.vue`,
      import.meta.glob<DefineComponent>('./pages/**/*.vue')
    )
  },
  setup({ el, App, props, plugin }) {
    createSSRApp({ render: () => h(TuyauProvider, { client }, { default: () => h(App, props) }) })
      .use(plugin)
      .mount(el)
  },
})
