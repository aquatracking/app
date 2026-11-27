import env from '#start/env'
import type User from '#models/user'
import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'
import { urlFor } from '@adonisjs/core/services/url_builder'

/**
 * Email with a password reset link, in the language of the user.
 */
export default class PasswordResetNotification extends BaseMail {
  constructor(
    private user: User,
    private token: string
  ) {
    super()
  }

  prepare() {
    const i18n = i18nManager.locale(this.user.locale)
    const url = urlFor(
      'password_reset.edit',
      { token: this.token },
      { prefixUrl: env.get('APP_URL') }
    )

    this.message
      .to(this.user.email)
      .subject(i18n.t('emails.password_reset.subject'))
      .htmlView('emails/password_reset_html', { i18n, url, firstName: this.user.firstName })
      .textView('emails/password_reset_text', { i18n, url, firstName: this.user.firstName })
  }
}
