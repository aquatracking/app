import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Notification } from '#middleware/inertia_middleware'

/**
 * Pages meant for visitors who are not signed in (login, invitation,
 * password reset). A signed-in user is sent home with a message.
 */
export default class GuestMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.auth.isAuthenticated) {
      const notification: Notification = {
        type: 'error',
        message: ctx.i18n.t('auth.already_signed_in'),
      }
      ctx.session.flash('notification', notification)
      return ctx.response.redirect().toRoute('home')
    }

    return next()
  }
}
