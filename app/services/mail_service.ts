import User from '#models/user'
import UserToken from '#models/user_token'
import env from '#start/env'
import Router from '@adonisjs/core/services/router'
import i18nManager from '@adonisjs/i18n/services/main'
import mail from '@adonisjs/mail/services/main'

export default class MailService {
  async sendEmailVerification(user: User, token: UserToken, locale: string = 'en') {
    const i18n = i18nManager.locale(locale)

    const verificationLink = Router.makeUrl('auth.email.verify', undefined, {
      qs: { token: token.token },
      prefixUrl: env.get('BASE_URL').replace(/\/$/, ''),
    })

    await mail.sendLater((message) => {
      message
        .to(user.email)
        .subject(i18n.t('email.verifyYourEmail.subject'))
        .text(i18n.t('email.verifyYourEmail.text', { fullName: user.fullName, verificationLink }))
    })
  }

  async sendPasswordReset(user: User, token: UserToken, locale: string = 'en') {
    const i18n = i18nManager.locale(locale)

    const resetLink = Router.makeUrl('auth.password.reset', undefined, {
      qs: { token: token.token },
      prefixUrl: env.get('BASE_URL').replace(/\/$/, ''),
    })

    await mail.sendLater((message) => {
      message
        .to(user.email)
        .subject(i18n.t('email.resetYourPassword.subject'))
        .text(i18n.t('email.resetYourPassword.text', { fullName: user.fullName, resetLink }))
    })
  }

  async sendPasswordResetConfirmation(user: User, locale: string = 'en') {
    const i18n = i18nManager.locale(locale)

    await mail.sendLater((message) => {
      message
        .to(user.email)
        .subject(i18n.t('email.passwordResetConfirmation.subject'))
        .text(i18n.t('email.passwordResetConfirmation.text', { fullName: user.fullName }))
    })
  }
}
