import * as abilities from '#abilities/main'
import { Bouncer } from '@adonisjs/bouncer'
import { policies } from '#generated/policies'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Creates the Bouncer instance of the request, for the signed-in user.
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.bouncer = new Bouncer(
      () => ctx.auth.user || null,
      abilities,
      policies
    ).setContainerResolver(ctx.containerResolver)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    bouncer: Bouncer<
      Exclude<HttpContext['auth']['user'], undefined>,
      typeof abilities,
      typeof policies
    >
  }
}
