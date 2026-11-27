import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { Notification } from '#middleware/inertia_middleware'
import { PasswordResetService } from '#services/password_reset_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth'

/**
 * Forgotten password and reset from a link (docs/features/02-auth-profile.md).
 */
export default class PasswordResetController {
  /**
   * With SMTP, the form to request a link. Without, the page tells to ask
   * an administrator (the page reads the shared "mailEnabled").
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  /**
   * Emails a link if an account has this email. The answer is the same
   * whether it exists or not.
   */
  @inject()
  async store(
    { request, response, session, i18n }: HttpContext,
    passwordResetService: PasswordResetService
  ) {
    if (!app.config.get<boolean>('app.mail.enabled')) {
      return response.abort('Not found', 404)
    }

    const { email } = await request.validateUsing(forgotPasswordValidator)
    await passwordResetService.sendLink(email)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('auth.forgot_password.sent'),
    }
    session.flash('notification', notification)
    return response.redirect().back()
  }

  /**
   * The form of a valid link, or the "invalid link" message: the token is
   * checked as soon as the page is shown.
   */
  @inject()
  async edit({ params, inertia }: HttpContext, passwordResetService: PasswordResetService) {
    const user = await passwordResetService.findUser(params.token)

    return inertia.render('auth/reset_password', { token: params.token, valid: user !== null })
  }

  @inject()
  async update(
    { params, request, auth, response, session, i18n }: HttpContext,
    passwordResetService: PasswordResetService
  ) {
    const { password } = await request.validateUsing(resetPasswordValidator)
    const user = await passwordResetService.reset(params.token, password)

    await auth.use('web').login(user)
    const notification: Notification = {
      type: 'success',
      message: i18n.t('auth.reset_password.done'),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.index')
  }
}
