import { inject } from '@adonisjs/core'
import { SetupService } from '#services/setup_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import SetupAlreadyDoneException from '#exceptions/setup_already_done_exception'

/**
 * Routes of the setup screen itself.
 */
const SETUP_ROUTES = new Set(['setup.show', 'setup.store'])

/**
 * Routes that stay reachable during setup. Static files are served by a
 * server middleware, before the router: they never reach this one.
 */
const ALWAYS_REACHABLE_ROUTES = new Set(['health_checks.live'])

/**
 * While no user exists, every page redirects to the setup screen. Once
 * the instance is installed, the setup screen answers 404.
 */
@inject()
export default class SetupMiddleware {
  constructor(protected setupService: SetupService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const routeName = ctx.route?.name ?? ''
    if (ALWAYS_REACHABLE_ROUTES.has(routeName)) {
      return next()
    }

    const isDone = await this.setupService.isDone()
    const isSetupRoute = SETUP_ROUTES.has(routeName)

    if (isDone && isSetupRoute) {
      throw new SetupAlreadyDoneException()
    }
    if (!isDone && !isSetupRoute) {
      return ctx.response.redirect().toRoute('setup.show')
    }

    return next()
  }
}
