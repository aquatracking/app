import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Records the last activity of the signed-in user, including when the
 * session was restored by "remember me" (docs/features/02-auth-profile.md).
 * Runs after the silent auth middleware, which authenticates the request.
 */
export default class LastSeenMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.auth.user) {
      await ctx.auth.user.recordActivity()
    }

    return next()
  }
}
