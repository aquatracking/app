import { mailEnabled } from '#config/mail'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

/**
 * Success or business error message shown once after a redirect.
 */
export type Notification = { type: 'success' | 'error'; message: string }

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered.
     * Session, auth and i18n are server middleware (start/kernel.ts), so
     * they are set even on 404 pages. They are still missing when an error
     * is raised before them: never assume the HttpContext is fully hydrated.
     */
    const { auth, i18n } = ctx as Partial<HttpContext>

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      locale: ctx.inertia.always(i18n?.locale ?? 'en'),
      timezone: ctx.inertia.always(auth?.user?.timezone ?? 'UTC'),
      mailEnabled: ctx.inertia.always(mailEnabled),
    }
  }

  flash(ctx: HttpContext) {
    /**
     * Flash messages travel in the dedicated `flash` field of the page
     * object instead of props, and the client strips them from history
     * state so they never reappear when navigating back.
     */
    const { session } = ctx as Partial<HttpContext>
    const notification: Notification | undefined = session?.flashMessages.get('notification')

    return { notification }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
