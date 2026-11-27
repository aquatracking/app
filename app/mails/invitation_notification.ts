import type User from '#models/user'
import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Email with an invitation link, in the language of the administrator
 * who sends it: the language of the invited person is not known yet.
 */
export default class InvitationNotification extends BaseMail {
  constructor(
    private admin: User,
    private email: string,
    private url: string
  ) {
    super()
  }

  prepare() {
    const i18n = i18nManager.locale(this.admin.locale)
    const data = { i18n, url: this.url, adminName: this.admin.firstName }

    this.message
      .to(this.email)
      .subject(i18n.t('emails.invitation.subject', { adminName: this.admin.firstName }))
      .htmlView('emails/invitation_html', data)
      .textView('emails/invitation_text', data)
  }
}
