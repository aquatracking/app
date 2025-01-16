import User from '#models/user'
import UserToken from '#models/user_token'
import MailService from '#services/mail_service'
import { passwordForgotValidator } from '#validators/password_forgot_validator'
import { passwordResetValidator } from '#validators/password_reset_validator'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class PasswordResetController {
  constructor(protected mailService: MailService) {}

  async forgot({ inertia }: HttpContext) {
    return inertia.render('auth/password/forgot')
  }

  async send({ request, response, session, i18n }: HttpContext) {
    const { email } = await request.validateUsing(passwordForgotValidator)

    const user = await User.findBy('email', email)

    if (user) {
      const token = await UserToken.generatePasswordResetToken(user)

      await this.mailService.sendPasswordReset(user, token, i18n.locale)
    }

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.resetLinkSent'),
    })

    return response.redirect().back()
  }

  async reset({ inertia, request }: HttpContext) {
    return inertia.render('auth/password/reset', {
      token: request.qs().token,
    })
  }

  async store({ request, response, session, i18n }: HttpContext) {
    const { token, password } = await request.validateUsing(passwordResetValidator)

    const user = await UserToken.getPasswordResetUser(token)

    if (!user) {
      session.flash('errors', {
        token: [i18n.t('validation.invalidToken')],
      })
      session.flashAll()
      return response.redirect().back()
    }

    user.password = password
    await user.save()

    await UserToken.deleteUserPasswordResetTokens(user)

    await this.mailService.sendPasswordResetConfirmation(user, i18n.locale)

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.passwordReset'),
    })

    return response.redirect().toPath('/auth/login')
  }
}
