import type User from '#models/user'
import type Invitation from '#models/invitation'
import { BasePolicy } from '@adonisjs/bouncer'

/**
 * Invitations, the only way to sign up, are managed by administrators.
 */
export default class InvitationPolicy extends BasePolicy {
  viewList(actor: User) {
    return actor.isAdmin
  }

  create(actor: User) {
    return actor.isAdmin
  }

  renew(actor: User, _invitation: Invitation) {
    return actor.isAdmin
  }

  delete(actor: User, _invitation: Invitation) {
    return actor.isAdmin
  }
}
