import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'

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
    ctx.session.notify(
      'error',
      ctx.i18n.t(`errors.${error.code}`, error.translationData(ctx), error.message)
    )
    return ctx.response.redirect().back()
  }
}
