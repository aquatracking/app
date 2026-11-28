import { inject } from '@adonisjs/core'
import { TIMEZONES } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { registrationValidator } from '#validators/auth'
import { RegistrationService } from '#services/registration_service'
import InvitationTransformer from '#transformers/invitation_transformer'

/**
 * Account creation from an invitation link (docs/features/02-auth-profile.md).
 */
export default class RegistrationController {
  /**
   * The form of a valid invitation, or the "invalid invitation" message.
   */
  @inject()
  async create({ params, inertia }: HttpContext, registrationService: RegistrationService) {
    const invitation = await registrationService.findInvitation(params.token)

    return inertia.render('auth/register', {
      token: params.token,
      invitation: invitation ? InvitationTransformer.transform(invitation) : null,
      timezones: TIMEZONES,
    })
  }

  @inject()
  async store(
    { params, request, auth, response }: HttpContext,
    registrationService: RegistrationService
  ) {
    const data = await request.validateUsing(registrationValidator)
    const user = await registrationService.register(params.token, data)

    await auth.use('web').login(user)
    return response.redirect().toRoute('vivariums.index')
  }
}
