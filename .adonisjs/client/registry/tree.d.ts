/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
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
}
