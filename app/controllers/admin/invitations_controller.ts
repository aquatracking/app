import { inject } from '@adonisjs/core'
import Invitation from '#models/invitation'
import type { HttpContext } from '@adonisjs/core/http'
import InvitationPolicy from '#policies/invitation_policy'
import { createInvitationValidator } from '#validators/admin'
import InvitationTransformer from '#transformers/invitation_transformer'
import type { GeneratedLink } from '#middleware/inertia_middleware'
import { type InvitationLink, InvitationService } from '#services/invitation_service'

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
  async store(ctx: HttpContext, invitationService: InvitationService) {
    await ctx.bouncer.with(InvitationPolicy).authorize('create')
    const { email } = await ctx.request.validateUsing(createInvitationValidator)

    const link = await invitationService.invite(ctx.auth.getUserOrFail(), email)
    return this.showLink(ctx, link)
  }

  @inject()
  async renew(ctx: HttpContext, invitationService: InvitationService) {
    const invitation = await Invitation.findOrFail(ctx.params.id)
    await ctx.bouncer.with(InvitationPolicy).authorize('renew', invitation)

    const link = await invitationService.renew(ctx.auth.getUserOrFail(), invitation)
    return this.showLink(ctx, link)
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

  /**
   * Back to the list, with the link of the invitation shown once.
   */
  protected showLink({ response, session }: HttpContext, link: InvitationLink) {
    const generatedLink: GeneratedLink = {
      kind: 'invitation',
      email: link.invitation.email,
      url: link.url,
      emailed: link.emailed,
    }
    session.flash('generatedLink', generatedLink)
    return response.redirect().toRoute('admin.invitations.index')
  }
}
