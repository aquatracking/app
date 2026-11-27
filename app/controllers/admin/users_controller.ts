import User from '#models/user'
import { inject } from '@adonisjs/core'
import UserPolicy from '#policies/user_policy'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { PasswordResetService } from '#services/password_reset_service'
import { deleteUserValidator, updateAdminValidator } from '#validators/admin'
import { UserAdministrationService } from '#services/user_administration_service'
import type { GeneratedLink, Notification } from '#middleware/inertia_middleware'

/**
 * Accounts of the instance, managed by administrators
 * (docs/features/03-admin.md).
 */
export default class UsersController {
  async index({ bouncer, inertia }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('viewList')

    const users = await User.query().preload('invitedBy').orderBy('created_at', 'asc')

    return inertia.render('admin/users/index', {
      users: UserTransformer.transform(users).useVariant('forAdmin'),
    })
  }

  @inject()
  async toggleAdmin(
    { params, request, auth, bouncer, response, session, i18n }: HttpContext,
    userAdministrationService: UserAdministrationService
  ) {
    const target = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('updateAdmin', target)
    const { isAdmin } = await request.validateUsing(updateAdminValidator)

    await userAdministrationService.setAdmin(auth.getUserOrFail(), target, isAdmin)

    const notification: Notification = {
      type: 'success',
      message: i18n.t(isAdmin ? 'admin.users.admin_granted' : 'admin.users.admin_removed', {
        name: target.displayName,
      }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('admin.users.index')
  }

  @inject()
  async destroy(
    { params, request, auth, bouncer, response, session, i18n }: HttpContext,
    userAdministrationService: UserAdministrationService
  ) {
    const target = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('delete', target)
    await request.validateUsing(deleteUserValidator, { meta: { email: target.email } })

    await userAdministrationService.delete(auth.getUserOrFail(), target)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('admin.users.deleted', { email: target.email }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('admin.users.index')
  }

  /**
   * Creates a password reset link for the user, shown to the
   * administrator to pass it on (and emailed with SMTP).
   */
  @inject()
  async createPasswordReset(
    { params, bouncer, response, session }: HttpContext,
    passwordResetService: PasswordResetService
  ) {
    const target = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('createPasswordReset', target)

    const { url, emailed } = await passwordResetService.createLink(target)

    const generatedLink: GeneratedLink = {
      kind: 'password_reset',
      email: target.email,
      url,
      emailed,
    }
    session.flash('generatedLink', generatedLink)
    return response.redirect().toRoute('admin.users.index')
  }
}
