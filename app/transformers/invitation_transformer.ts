import { DateTime } from 'luxon'
import type Invitation from '#models/invitation'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class InvitationTransformer extends BaseTransformer<Invitation> {
  toObject() {
    return this.pick(this.resource, ['email'])
  }

  /**
   * A row of the administration's list of invitations. "invitedBy" must
   * be preloaded.
   */
  forAdmin() {
    return {
      ...this.pick(this.resource, ['id', 'email']),
      invitedByName: this.resource.invitedBy?.displayName ?? null,
      expiresAt: this.resource.expiresAt.toUTC().toISO()!,
      expired: this.resource.expiresAt <= DateTime.now(),
    }
  }
}
