import UserToken from '#models/user_token'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class EmailVerificationController {
  async verify({ request, session, response, i18n }: HttpContext) {
    const { token } = request.qs()

    const validatedToken = await vine
      .compile(vine.string())
      .validate(token)
      .catch(() => null)

    if (!validatedToken) {
      session.flashErrors({
        E_MISSING_EMAIL_VERIFICATION_TOKEN: i18n.t('errors.E_MISSING_EMAIL_VERIFICATION_TOKEN'),
      })
      return response.redirect().toPath('/auth/login')
    }

    const user = await UserToken.getEmailVerificationUser(validatedToken)

    if (user) {
      user.verified = true
      await user.save()

      await UserToken.deleteUserEmailVerificationTokens(user)

      session.flash('notification', {
        type: 'success',
        message: i18n.t('notifications.emailVerified'),
      })
    } else {
      session.flashErrors({
        E_INVALID_EMAIL_VERIFICATION_TOKEN_TRY_AGAIN: i18n.t(
          'errors.E_INVALID_EMAIL_VERIFICATION_TOKEN_TRY_AGAIN'
        ),
      })
    }
    return response.redirect().toPath('/auth/login')
  }
}
