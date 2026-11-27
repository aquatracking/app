import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'setup.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'registration.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'registration.store': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.update_password': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.toggle_admin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.create_password_reset': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.index': { paramsTuple?: []; params?: {} }
    'admin.invitations.store': { paramsTuple?: []; params?: {} }
    'admin.invitations.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'registration.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.invitations.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'registration.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.invitations.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'setup.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'registration.store': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'admin.users.create_password_reset': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.store': { paramsTuple?: []; params?: {} }
    'admin.invitations.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.update_password': { paramsTuple?: []; params?: {} }
    'admin.users.toggle_admin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}