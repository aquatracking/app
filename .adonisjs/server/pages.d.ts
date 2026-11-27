import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.vue'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/register': ExtractProps<(typeof import('../../inertia/pages/auth/register.vue'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'profile/edit': ExtractProps<(typeof import('../../inertia/pages/profile/edit.vue'))['default']>
    'setup/show': ExtractProps<(typeof import('../../inertia/pages/setup/show.vue'))['default']>
  }
}
