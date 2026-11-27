import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import type { Notification } from '#middleware/inertia_middleware'

/**
 * Business error shown to the user as a notification on the previous page.
 * The message is the translation "errors.<code>".
 */
export default abstract class NotifiedException extends Exception {
  static status = 400

  /**
   * Values of the placeholders of the message.
   */
  protected translationData(_ctx: HttpContext): Record<string, unknown> {
    return {}
  }

  async handle(error: this, ctx: HttpContext) {
    const notification: Notification = {
      type: 'error',
      message: ctx.i18n.t(`errors.${error.code}`, error.translationData(ctx), error.message),
    }
    ctx.session.flash('notification', notification)
    return ctx.response.redirect().back()
  }
}
