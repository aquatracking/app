/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  healthChecks: {
    live: typeof routes['health_checks.live']
  }
  setup: {
    show: typeof routes['setup.show']
    store: typeof routes['setup.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  registration: {
    create: typeof routes['registration.create']
    store: typeof routes['registration.store']
  }
  passwordReset: {
    create: typeof routes['password_reset.create']
    store: typeof routes['password_reset.store']
    edit: typeof routes['password_reset.edit']
    update: typeof routes['password_reset.update']
  }
  profile: {
    edit: typeof routes['profile.edit']
    update: typeof routes['profile.update']
    updatePassword: typeof routes['profile.update_password']
  }
  vivariums: {
    index: typeof routes['vivariums.index']
    archived: typeof routes['vivariums.archived']
    create: typeof routes['vivariums.create']
    store: typeof routes['vivariums.store']
    show: typeof routes['vivariums.show']
    edit: typeof routes['vivariums.edit']
    update: typeof routes['vivariums.update']
    archive: typeof routes['vivariums.archive']
    unarchive: typeof routes['vivariums.unarchive']
  }
  vivariumImages: {
    update: typeof routes['vivarium_images.update']
    destroy: typeof routes['vivarium_images.destroy']
    show: typeof routes['vivarium_images.show']
  }
  trackedMeasures: {
    index: typeof routes['tracked_measures.index']
    store: typeof routes['tracked_measures.store']
    reorder: typeof routes['tracked_measures.reorder']
    destroy: typeof routes['tracked_measures.destroy']
  }
  admin: {
    users: {
      index: typeof routes['admin.users.index']
      toggleAdmin: typeof routes['admin.users.toggle_admin']
      destroy: typeof routes['admin.users.destroy']
      createPasswordReset: typeof routes['admin.users.create_password_reset']
    }
    invitations: {
      index: typeof routes['admin.invitations.index']
      store: typeof routes['admin.invitations.store']
      renew: typeof routes['admin.invitations.renew']
      destroy: typeof routes['admin.invitations.destroy']
    }
  }
}
