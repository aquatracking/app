import type User from '#models/user'
import type Vivarium from '#models/vivarium'
import { AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'

/**
 * Only the owner of a vivarium sees it or acts on it. Anyone else gets a
 * 404, as if it did not exist: its existence is not revealed
 * (docs/features/04-vivariums.md). An archived vivarium is read-only:
 * its owner may only unarchive it, other changes are refused with a
 * notification.
 */
export default class VivariumPolicy extends BasePolicy {
  view(user: User, vivarium: Vivarium) {
    return this.owner(user, vivarium)
  }

  /**
   * Changing the vivarium (form, image, tracked measures, readings) or
   * archiving it.
   */
  update(user: User, vivarium: Vivarium) {
    const owner = this.owner(user, vivarium)
    if (!owner.authorized) {
      return owner
    }
    if (vivarium.isArchived) {
      return AuthorizationResponse.deny('This vivarium is archived').t('errors.E_VIVARIUM_ARCHIVED')
    }
    return AuthorizationResponse.allow()
  }

  unarchive(user: User, vivarium: Vivarium) {
    return this.owner(user, vivarium)
  }

  private owner(user: User, vivarium: Vivarium) {
    return user.id === vivarium.userId
      ? AuthorizationResponse.allow()
      : AuthorizationResponse.deny('Not found', 404)
  }
}
