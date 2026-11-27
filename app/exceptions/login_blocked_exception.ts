import type { HttpContext } from '@adonisjs/core/http'
import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when a login attempt comes while one of its limiting keys is
 * blocked. The message says when to try again, not which key is blocked.
 */
export default class LoginBlockedException extends NotifiedException {
  static status = 429
  static code = 'E_LOGIN_BLOCKED'
  static message = 'Too many failed login attempts'

  /**
   * @param retryAfter - Seconds before a new attempt is allowed
   */
  constructor(public retryAfter: number) {
    super()
  }

  protected translationData(ctx: HttpContext) {
    const minutes = Math.max(1, Math.ceil(this.retryAfter / 60))
    const duration = new Intl.DurationFormat(ctx.i18n.locale, { style: 'long' }).format({
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    })
    return { duration }
  }
}
