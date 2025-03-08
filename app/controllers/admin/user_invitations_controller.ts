import User from '#models/user'
import UserInvitation from '#models/user_invitation'
import { userInviteValidator } from '#validators/user_invite_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersInvitationController {
  async store({ request, session, i18n, response }: HttpContext) {
    const { email } = await request.validateUsing(userInviteValidator)

    const existingUser = await User.query().where('email', email).first()
    const existingInvitation = await UserInvitation.query().where('email', email).first()

    if (existingUser) {
      session.flashErrors({
        E_EMAIL_ALREADY_USED: i18n.t('errors.E_EMAIL_ALREADY_USED'),
      })
    } else if (existingInvitation) {
      await existingInvitation.delete()

      const invitation = await UserInvitation.generateInvite(email, i18n.locale)

      session.flash('notification', {
        type: 'success',
        message: i18n.t('notifications.invitationRenewed', { email: invitation.email }),
      })
    } else {
      const invitation = await UserInvitation.generateInvite(email, i18n.locale)

      session.flash('notification', {
        type: 'success',
        message: i18n.t('notifications.invitationSent', { email: invitation.email }),
      })
    }

    return response.redirect().toRoute('admin.users.index')
  }

  async destroy({ params, session, i18n, response }: HttpContext) {
    const invitation = await UserInvitation.findOrFail(params.id)

    await invitation?.delete()

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.invitationDeleted', { email: invitation.email }),
    })

    return response.redirect().toRoute('admin.users.index')
  }
}
