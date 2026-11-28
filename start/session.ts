/*
|--------------------------------------------------------------------------
| Session macros
|--------------------------------------------------------------------------
|
| "session.notify" flashes the notification shown once after a redirect
| (success or business error), shared with the pages by the Inertia
| middleware.
|
*/

import { Session } from '@adonisjs/session'
import type { Notification } from '#middleware/inertia_middleware'

declare module '@adonisjs/session' {
  interface Session {
    notify(type: Notification['type'], message: string): void
  }
}

Session.macro('notify', function (this: Session, type: Notification['type'], message: string) {
  const notification: Notification = { type, message }
  this.flash('notification', notification)
})
