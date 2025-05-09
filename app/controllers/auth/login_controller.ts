import User from '#models/user'
import UserToken from '#models/user_token'
import MailService from '#services/mail_service'
import env from '#start/env'
import { loginValidator } from '#validators/login_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class LoginController {
  constructor(protected mailService: MailService) {}

  /**
   * Display the login form
   */
  async index({ inertia }: HttpContext) {
    const requireInvitation = env.get('REQUIRE_INVITATION')
    return inertia.render('auth/login', { requireInvitation: !!requireInvitation })
  }

  /**
   * Handle form submission for the login action
   */
  async store({ request, auth, response, session, i18n }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    logger.info(`User ${email} (${user.id}) logged in`)

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
