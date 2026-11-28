import { inject } from '@adonisjs/core'
import { TIMEZONES } from '#catalog/timezones'
import type { HttpContext } from '@adonisjs/core/http'
import i18nManager from '@adonisjs/i18n/services/main'
import { ProfileService } from '#services/profile_service'
import { updatePasswordValidator, updateProfileValidator } from '#validators/profile'

/**
 * The user's own profile (docs/features/02-auth-profile.md). The page reads
 * the shared user, language and time zone, and receives the list of time
 * zones.
 */
export default class ProfileController {
  async edit({ inertia }: HttpContext) {
    return inertia.render('profile/edit', { timezones: TIMEZONES })
  }

  /**
   * Saves the name, language and time zone. The email is not part of the
   * validator: a submitted email is ignored.
   */
  async update({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)

    user.merge(data)
    await user.save()

    /**
     * Already in the language just chosen, like the next page.
     */
    session.notify('success', i18nManager.locale(user.locale).t('profile.saved'))
    return response.redirect().toRoute('profile.edit')
  }

  /**
   * Changes the password, after checking the current one.
   */
  @inject()
  async updatePassword(
    { auth, request, response, session, i18n }: HttpContext,
    profileService: ProfileService
  ) {
    const user = auth.getUserOrFail()
    const { password } = await request.validateUsing(updatePasswordValidator, { meta: { user } })

    const guard = auth.use('web')
    await profileService.changePassword(
      user,
      password,
      request.encryptedCookie(guard.rememberMeKeyName)
    )

    session.notify('success', i18n.t('profile.password_changed'))
    return response.redirect().toRoute('profile.edit')
  }
}
