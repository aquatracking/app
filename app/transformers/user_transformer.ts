import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'firstName', 'lastName', 'email', 'isAdmin'])
  }

  /**
   * A row of the administration's list of users. Nothing about the
   * vivariums of the user (docs/features/03-admin.md). "invitedBy" must be
   * preloaded.
   */
  forAdmin() {
    return {
      ...this.pick(this.resource, ['id', 'displayName', 'email', 'isAdmin']),
      invitedByName: this.resource.invitedBy?.displayName ?? null,
      createdAt: this.resource.createdAt.toUTC().toISO()!,
      lastSeenAt: this.resource.lastSeenAt?.toUTC().toISO() ?? null,
    }
  }
}
