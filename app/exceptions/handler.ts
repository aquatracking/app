import app from '@adonisjs/core/services/app'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import { errors as limiterErrors } from '@adonisjs/limiter'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. Rendered in production and in tests (so that they are tested);
   * development keeps the detailed error pages.
   */
  protected renderStatusPages = !app.inDev

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (_, { inertia }) => inertia.render('errors/not_found', {}),
    '500..599': (_, { inertia }) => inertia.render('errors/server_error', {}),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * An Inertia form would show the plain-text 429 response in a modal:
     * the limit is reported as a notification on the page instead.
     */
    if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS && ctx.request.header('x-inertia')) {
      ctx.session.notify('error', error.getResponseMessage(ctx))
      return ctx.response.redirect().back()
    }

    /**
     * Failed login: one message whether the email exists or not, shown
     * like the other business errors.
     */
    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      ctx.session.notify('error', error.getResponseMessage(error, ctx))
      return ctx.response.redirect().back()
    }

    /**
     * A guest is sent to the login page, which brings them back to the
     * page they asked for, query string included, once signed in
     * (docs/features/02-auth-profile.md). The auth package would also
     * forward that query string to the login page: it is left out.
     */
    if (
      error instanceof authErrors.E_UNAUTHORIZED_ACCESS &&
      error.guardDriverName === 'session' &&
      [null, 'html'].includes(ctx.request.accepts(['html', 'application/vnd.api+json', 'json']))
    ) {
      return ctx.response
        .redirect()
        .withIntendedUrl()
        .toPath(error.redirectTo || '/')
    }

    /**
     * Refused access answers 403 with its page, form submissions included
     * (Bouncer would redirect them back): the administration is not shown
     * to non-administrators (docs/features/03-admin.md). A policy that
     * hides the existence of a resource (VivariumPolicy) denies with 404
     * instead, rendered as any missing page. A refusal that explains
     * itself to the owner (archived vivarium) is a notification on the
     * previous page.
     */
    if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
      if (error.response.status === 404) {
        return ctx.response.status(404).send(await ctx.inertia.render('errors/not_found', {}))
      }
      if (error.response.translation) {
        ctx.session.notify('error', error.getResponseMessage(ctx))
        return ctx.response.redirect().back()
      }
      return ctx.response.status(403).send(await ctx.inertia.render('errors/forbidden', {}))
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
