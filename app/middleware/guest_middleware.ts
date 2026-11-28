import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Pages meant for visitors who are not signed in (login, invitation,
 * password reset). A signed-in user is sent home with a message.
 */
export default class GuestMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.auth.isAuthenticated) {
      ctx.session.notify('error', ctx.i18n.t('auth.already_signed_in'))
      return ctx.response.redirect().toRoute('vivariums.index')
    }

    return next()
  }
}
