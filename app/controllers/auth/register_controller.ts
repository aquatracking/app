import User from '#models/user'
import UserInvitation from '#models/user_invitation'
import UserToken from '#models/user_token'
import MailService from '#services/mail_service'
import env from '#start/env'
import { createRegisterValidator } from '#validators/register_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'

@inject()
export default class RegisterController {
  constructor(protected mailService: MailService) {}

  /**
   * Display the registration form
   */
  async index({ inertia, request, session, i18n, response }: HttpContext) {
    if (!env.get('REQUIRE_INVITATION')) {
      return inertia.render('auth/register')
    }

    const { invitationToken } = await request.validateUsing(
      vine.compile(
        vine.object({
          invitationToken: vine.string().optional(),
        })
      )
    )

    if (!invitationToken) {
      session.flashErrors({
        E_INVITATION_REQUIRED: i18n.t('errors.E_INVITATION_REQUIRED'),
      })

      return response.redirect().toPath('/auth/login')
    }

    const invitation = await UserInvitation.query().where('token', invitationToken).first()

    if (!invitation || invitation.isExpired()) {
      session.flashErrors({
        E_INVITATION_INVALID: i18n.t('errors.E_INVITATION_INVALID'),
      })
      return response.redirect().toPath('/auth/login')
    }

    return inertia.render('auth/register', {
      email: invitation.email,
    })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response, session, i18n }: HttpContext) {
    const { fullName, email, password, invitationToken } =
      await request.validateUsing(createRegisterValidator)

    if (env.get('REQUIRE_INVITATION')) {
      if (!invitationToken) {
        session.flashErrors({
          E_INVITATION_REQUIRED: i18n.t('errors.E_INVITATION_REQUIRED'),
        })

        return response.redirect().toPath('/auth/login')
      }

      const invitation = await UserInvitation.query()
        .where('email', email)
        .where('token', invitationToken)
        .first()

      if (!invitation || invitation.isExpired()) {
        session.flashErrors({
          E_INVITATION_INVALID: i18n.t('errors.E_INVITATION_INVALID'),
        })
        return response.redirect().toPath('/auth/login')
      }
    }

    const user = await User.create({ fullName, email, password })

    await UserInvitation.query().where('email', email).delete()

    const token = await UserToken.generateEmailVerificationToken(user)
    await this.mailService.sendEmailVerification(user, token, i18n.locale)

    logger.info(`Account created for user ${email} (${user.id})`)

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.accountCreatedCheckEmail'),
    })

    return response.redirect().toPath('/auth/login')
  }
}
