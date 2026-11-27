import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'setup.store': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'setup.store': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}