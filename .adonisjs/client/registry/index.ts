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
