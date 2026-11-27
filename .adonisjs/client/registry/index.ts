/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [[0,"/"]],
    types: placeholder as Registry['home']['types'],
  },
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
