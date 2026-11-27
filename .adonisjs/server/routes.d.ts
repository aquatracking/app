import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
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
    'vivariums.index': { paramsTuple?: []; params?: {} }
    'vivariums.archived': { paramsTuple?: []; params?: {} }
    'vivariums.create': { paramsTuple?: []; params?: {} }
    'vivariums.store': { paramsTuple?: []; params?: {} }
    'vivariums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'filename': ParamValue} }
    'tracked_measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.reorder': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'trackedMeasureId': ParamValue} }
    'measures.store_reading': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.edit_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'measures.update_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'measures.destroy_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'charts.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'code': ParamValue} }
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
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'registration.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'vivariums.index': { paramsTuple?: []; params?: {} }
    'vivariums.archived': { paramsTuple?: []; params?: {} }
    'vivariums.create': { paramsTuple?: []; params?: {} }
    'vivariums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'filename': ParamValue} }
    'tracked_measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.edit_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'charts.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'code': ParamValue} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.invitations.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'registration.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.edit': { paramsTuple?: []; params?: {} }
    'vivariums.index': { paramsTuple?: []; params?: {} }
    'vivariums.archived': { paramsTuple?: []; params?: {} }
    'vivariums.create': { paramsTuple?: []; params?: {} }
    'vivariums.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'filename': ParamValue} }
    'tracked_measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.edit_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'charts.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'code': ParamValue} }
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
    'vivariums.store': { paramsTuple?: []; params?: {} }
    'vivariums.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivariums.unarchive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.store_reading': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.create_password_reset': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.store': { paramsTuple?: []; params?: {} }
    'admin.invitations.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.update_password': { paramsTuple?: []; params?: {} }
    'vivariums.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vivarium_images.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.reorder': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'measures.update_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'admin.users.toggle_admin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'vivarium_images.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tracked_measures.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'trackedMeasureId': ParamValue} }
    'measures.destroy_reading': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'measuredAt': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.invitations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}