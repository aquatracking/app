import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class LoggingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    ctx.logger = ctx.logger.child({
      action: ctx.route?.name,
      request: {
        method: ctx.request.method(),
        url: ctx.request.url(),
        query: ctx.request.qs(),
      },
    })

    /**
     * Call next method in the pipeline and return its output
     */
    return await next()
  }
}
