/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'health_checks.live': {
    methods: ["GET","HEAD"],
    pattern: '/health/live',
    tokens: [[0,"health"],[0,"live"]],
    types: placeholder as Registry['health_checks.live']['types'],
  },
  'setup.show': {
    methods: ["GET","HEAD"],
    pattern: '/setup',
    tokens: [[0,"setup"]],
    types: placeholder as Registry['setup.show']['types'],
  },
  'setup.store': {
    methods: ["POST"],
    pattern: '/setup',
    tokens: [[0,"setup"]],
    types: placeholder as Registry['setup.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.store']['types'],
  },
  'registration.create': {
    methods: ["GET","HEAD"],
    pattern: '/invitations/:token',
    tokens: [[0,"invitations"],[1,"token"]],
    types: placeholder as Registry['registration.create']['types'],
  },
  'registration.store': {
    methods: ["POST"],
    pattern: '/invitations/:token',
    tokens: [[0,"invitations"],[1,"token"]],
    types: placeholder as Registry['registration.store']['types'],
  },
  'password_reset.create': {
    methods: ["GET","HEAD"],
    pattern: '/forgot-password',
    tokens: [[0,"forgot-password"]],
    types: placeholder as Registry['password_reset.create']['types'],
  },
  'password_reset.store': {
    methods: ["POST"],
    pattern: '/forgot-password',
    tokens: [[0,"forgot-password"]],
    types: placeholder as Registry['password_reset.store']['types'],
  },
  'password_reset.edit': {
    methods: ["GET","HEAD"],
    pattern: '/reset-password/:token',
    tokens: [[0,"reset-password"],[1,"token"]],
    types: placeholder as Registry['password_reset.edit']['types'],
  },
  'password_reset.update': {
    methods: ["POST"],
    pattern: '/reset-password/:token',
    tokens: [[0,"reset-password"],[1,"token"]],
    types: placeholder as Registry['password_reset.update']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [[0,"logout"]],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'profile.edit': {
    methods: ["GET","HEAD"],
    pattern: '/profile',
    tokens: [[0,"profile"]],
    types: placeholder as Registry['profile.edit']['types'],
  },
  'profile.update': {
    methods: ["PUT"],
    pattern: '/profile',
    tokens: [[0,"profile"]],
    types: placeholder as Registry['profile.update']['types'],
  },
  'profile.update_password': {
    methods: ["PUT"],
    pattern: '/profile/password',
    tokens: [[0,"profile"],[0,"password"]],
    types: placeholder as Registry['profile.update_password']['types'],
  },
  'vivariums.index': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [[0,"/"]],
    types: placeholder as Registry['vivariums.index']['types'],
  },
  'vivariums.archived': {
    methods: ["GET","HEAD"],
    pattern: '/vivariums/archived',
    tokens: [[0,"vivariums"],[0,"archived"]],
    types: placeholder as Registry['vivariums.archived']['types'],
  },
  'vivariums.create': {
    methods: ["GET","HEAD"],
    pattern: '/vivariums/create',
    tokens: [[0,"vivariums"],[0,"create"]],
    types: placeholder as Registry['vivariums.create']['types'],
  },
  'vivariums.store': {
    methods: ["POST"],
    pattern: '/vivariums',
    tokens: [[0,"vivariums"]],
    types: placeholder as Registry['vivariums.store']['types'],
  },
  'vivariums.show': {
    methods: ["GET","HEAD"],
    pattern: '/vivariums/:id',
    tokens: [[0,"vivariums"],[1,"id"]],
    types: placeholder as Registry['vivariums.show']['types'],
  },
  'vivariums.edit': {
    methods: ["GET","HEAD"],
    pattern: '/vivariums/:id/edit',
    tokens: [[0,"vivariums"],[1,"id"],[0,"edit"]],
    types: placeholder as Registry['vivariums.edit']['types'],
  },
  'vivariums.update': {
    methods: ["PUT"],
    pattern: '/vivariums/:id',
    tokens: [[0,"vivariums"],[1,"id"]],
    types: placeholder as Registry['vivariums.update']['types'],
  },
  'vivariums.archive': {
    methods: ["POST"],
    pattern: '/vivariums/:id/archive',
    tokens: [[0,"vivariums"],[1,"id"],[0,"archive"]],
    types: placeholder as Registry['vivariums.archive']['types'],
  },
  'vivariums.unarchive': {
    methods: ["POST"],
    pattern: '/vivariums/:id/unarchive',
    tokens: [[0,"vivariums"],[1,"id"],[0,"unarchive"]],
    types: placeholder as Registry['vivariums.unarchive']['types'],
  },
  'vivarium_images.update': {
    methods: ["PUT"],
    pattern: '/vivariums/:id/image',
    tokens: [[0,"vivariums"],[1,"id"],[0,"image"]],
    types: placeholder as Registry['vivarium_images.update']['types'],
  },
  'vivarium_images.destroy': {
    methods: ["DELETE"],
    pattern: '/vivariums/:id/image',
    tokens: [[0,"vivariums"],[1,"id"],[0,"image"]],
    types: placeholder as Registry['vivarium_images.destroy']['types'],
  },
  'vivarium_images.show': {
    methods: ["GET","HEAD"],
    pattern: '/vivariums/:id/image/:filename',
    tokens: [[0,"vivariums"],[1,"id"],[0,"image"],[1,"filename"]],
    types: placeholder as Registry['vivarium_images.show']['types'],
  },
  'admin.users.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/users',
    tokens: [[0,"admin"],[0,"users"]],
    types: placeholder as Registry['admin.users.index']['types'],
  },
  'admin.users.toggle_admin': {
    methods: ["PUT"],
    pattern: '/admin/users/:id/admin',
    tokens: [[0,"admin"],[0,"users"],[1,"id"],[0,"admin"]],
    types: placeholder as Registry['admin.users.toggle_admin']['types'],
  },
  'admin.users.destroy': {
    methods: ["DELETE"],
    pattern: '/admin/users/:id',
    tokens: [[0,"admin"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['admin.users.destroy']['types'],
  },
  'admin.users.create_password_reset': {
    methods: ["POST"],
    pattern: '/admin/users/:id/password-reset',
    tokens: [[0,"admin"],[0,"users"],[1,"id"],[0,"password-reset"]],
    types: placeholder as Registry['admin.users.create_password_reset']['types'],
  },
  'admin.invitations.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/invitations',
    tokens: [[0,"admin"],[0,"invitations"]],
    types: placeholder as Registry['admin.invitations.index']['types'],
  },
  'admin.invitations.store': {
    methods: ["POST"],
    pattern: '/admin/invitations',
    tokens: [[0,"admin"],[0,"invitations"]],
    types: placeholder as Registry['admin.invitations.store']['types'],
  },
  'admin.invitations.renew': {
    methods: ["POST"],
    pattern: '/admin/invitations/:id/renew',
    tokens: [[0,"admin"],[0,"invitations"],[1,"id"],[0,"renew"]],
    types: placeholder as Registry['admin.invitations.renew']['types'],
  },
  'admin.invitations.destroy': {
    methods: ["DELETE"],
    pattern: '/admin/invitations/:id',
    tokens: [[0,"admin"],[0,"invitations"],[1,"id"]],
    types: placeholder as Registry['admin.invitations.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
