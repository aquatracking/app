import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'admin/invitations/index': ExtractProps<(typeof import('../../inertia/pages/admin/invitations/index.vue'))['default']>
    'admin/users/index': ExtractProps<(typeof import('../../inertia/pages/admin/users/index.vue'))['default']>
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.vue'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/register': ExtractProps<(typeof import('../../inertia/pages/auth/register.vue'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.vue'))['default']>
    'errors/forbidden': ExtractProps<(typeof import('../../inertia/pages/errors/forbidden.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'measures/index': ExtractProps<(typeof import('../../inertia/pages/measures/index.vue'))['default']>
    'profile/edit': ExtractProps<(typeof import('../../inertia/pages/profile/edit.vue'))['default']>
    'setup/show': ExtractProps<(typeof import('../../inertia/pages/setup/show.vue'))['default']>
    'tracked_measures/index': ExtractProps<(typeof import('../../inertia/pages/tracked_measures/index.vue'))['default']>
    'vivariums/archived': ExtractProps<(typeof import('../../inertia/pages/vivariums/archived.vue'))['default']>
    'vivariums/create': ExtractProps<(typeof import('../../inertia/pages/vivariums/create.vue'))['default']>
    'vivariums/edit': ExtractProps<(typeof import('../../inertia/pages/vivariums/edit.vue'))['default']>
    'vivariums/index': ExtractProps<(typeof import('../../inertia/pages/vivariums/index.vue'))['default']>
    'vivariums/show': ExtractProps<(typeof import('../../inertia/pages/vivariums/show.vue'))['default']>
  }
}
