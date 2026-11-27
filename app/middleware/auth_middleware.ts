import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { urlFor } from '@adonisjs/core/services/url_builder'

/**
 * Lets only signed-in users through. Guests are sent to the login page,
 * which brings them back to the requested page once signed in.
 */
export default class AuthMiddleware {
  redirectTo = urlFor('session.create')

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
    return next()
  }
}
