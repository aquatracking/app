import User from '#models/user'
import UserToken from '#models/user_token'
import MailService from '#services/mail_service'
import { loginValidator } from '#validators/login_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class LoginController {
  constructor(protected mailService: MailService) {}

  /**
   * Display the login form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  /**
   * Handle form submission for the login action
   */
  async store({ request, auth, response, session, i18n }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    if (!user.verified) {
      const token = await UserToken.generateEmailVerificationToken(user)
      await this.mailService.sendEmailVerification(user, token, i18n.locale)

      session.flash('notification', {
        type: 'warn',
        message: i18n.t('notifications.emailNotVerified'),
      })

      return response.redirect().back()
    }

    await auth.use('web').login(user, rememberMe)

    return response.redirect('/')
  }
}
