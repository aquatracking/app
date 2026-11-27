import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Lets only signed-in users through. Guests are sent to the login page.
 */
export default class AuthMiddleware {
  /**
   * Provisional: the login page comes with feature 02, which will replace
   * this path by its route (docs/features/02-auth-profile.md).
   */
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
    return next()
  }
}
