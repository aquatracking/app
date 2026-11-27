import type User from '#models/user'
import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Email with a password reset link, in the language of the user.
 */
export default class PasswordResetNotification extends BaseMail {
  constructor(
    private user: User,
    private url: string
  ) {
    super()
  }

  prepare() {
    const i18n = i18nManager.locale(this.user.locale)
    const data = { i18n, url: this.url, firstName: this.user.firstName }

    this.message
      .to(this.user.email)
      .subject(i18n.t('emails.password_reset.subject'))
      .htmlView('emails/password_reset_html', data)
      .textView('emails/password_reset_text', data)
  }
}
