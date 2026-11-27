import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Lets only administrators into the administration section. Others get
 * 403 (rendered by the exception handler). Runs after "auth".
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.bouncer.authorize('administer')
    return next()
  }
}
