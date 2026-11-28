import { inject } from '@adonisjs/core'
import Invitation from '#models/invitation'
import type { HttpContext } from '@adonisjs/core/http'
import InvitationPolicy from '#policies/invitation_policy'
import { createInvitationValidator } from '#validators/admin'
import InvitationTransformer from '#transformers/invitation_transformer'
import { InvitationService } from '#services/invitation_service'

/**
 * Pending invitations, managed by administrators
 * (docs/features/03-admin.md).
 */
export default class InvitationsController {
  async index({ bouncer, inertia }: HttpContext) {
    await bouncer.with(InvitationPolicy).authorize('viewList')

    const invitations = await Invitation.query().preload('invitedBy').orderBy('expires_at', 'asc')

    return inertia.render('admin/invitations/index', {
      invitations: InvitationTransformer.transform(invitations).useVariant('forAdmin'),
    })
  }

  @inject()
  async store(
    { auth, bouncer, request, response, session }: HttpContext,
    invitationService: InvitationService
  ) {
    await bouncer.with(InvitationPolicy).authorize('create')
    const { email } = await request.validateUsing(createInvitationValidator)

    const { invitation, url, emailed } = await invitationService.invite(auth.getUserOrFail(), email)

    session.showLink({ kind: 'invitation', email: invitation.email, url, emailed })
    return response.redirect().toRoute('admin.invitations.index')
  }

  @inject()
  async renew(
    { params, auth, bouncer, response, session }: HttpContext,
    invitationService: InvitationService
  ) {
    const invitation = await Invitation.findOrFail(params.id)
    await bouncer.with(InvitationPolicy).authorize('renew', invitation)

    const { url, emailed } = await invitationService.renew(auth.getUserOrFail(), invitation)

    session.showLink({ kind: 'invitation', email: invitation.email, url, emailed })
    return response.redirect().toRoute('admin.invitations.index')
  }

  @inject()
  async destroy(
    { params, bouncer, response, session, i18n }: HttpContext,
    invitationService: InvitationService
  ) {
    const invitation = await Invitation.findOrFail(params.id)
    await bouncer.with(InvitationPolicy).authorize('delete', invitation)

    await invitationService.revoke(invitation)

    session.notify('success', i18n.t('admin.invitations.revoked', { email: invitation.email }))
    return response.redirect().toRoute('admin.invitations.index')
  }
}
