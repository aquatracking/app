import User from '#models/user'
import UserToken from '#models/user_token'
import MailService from '#services/mail_service'
import { createRegisterValidator } from '#validators/register_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class RegisterController {
  constructor(protected mailService: MailService) {}

  /**
   * Display the registration form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response, session, i18n }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(createRegisterValidator)

    const user = await User.create({ fullName, email, password })

    const token = await UserToken.generateEmailVerificationToken(user)
    await this.mailService.sendEmailVerification(user, token, i18n.locale)

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.accountCreatedCheckEmail'),
    })

    return response.redirect().toPath('/auth/login')
  }
}
