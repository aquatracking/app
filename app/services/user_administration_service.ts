import User from '#models/user'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { AuthorizationResponse, errors as bouncerErrors } from '@adonisjs/bouncer'
import { VivariumImageService } from '#services/vivarium_image_service'
import LastAdminException from '#exceptions/last_admin_exception'
import OwnAdminRightsException from '#exceptions/own_admin_rights_exception'
import OwnAccountDeletionException from '#exceptions/own_account_deletion_exception'

/**
 * Changes made by an administrator to the accounts of the instance
 * (docs/features/03-admin.md). The caller checks with UserPolicy that the
 * actor is an administrator.
 */
@inject()
export class UserAdministrationService {
  constructor(private vivariumImageService: VivariumImageService) {}

  /**
   * Names or removes an administrator. There always remains one: an
   * administrator cannot remove their own rights, nor those of the last
   * administrator. The actor must still be an administrator when the
   * change is saved, as for "delete".
   *
   * @throws OwnAdminRightsException when the actor removes their own rights
   * @throws LastAdminException when no other administrator would remain
   * @throws E_AUTHORIZATION_FAILURE when the actor was deleted or lost their rights
   */
  async setAdmin(actor: User, target: User, isAdmin: boolean) {
    if (!isAdmin && actor.id === target.id) {
      throw new OwnAdminRightsException()
    }

    await db.transaction(async (trx) => {
      /**
       * The administrators stay locked until the end of the transaction,
       * in the same order as in "delete" so that the two cannot deadlock:
       * two administrators removing each other's rights at the same time
       * cannot leave the instance without one, and an actor who lost
       * their rights meanwhile is refused.
       */
      const admins = await User.query({ client: trx })
        .where('is_admin', true)
        .select('id')
        .orderBy('id')
        .forUpdate()
      /**
       * Checked first: of two administrators removing each other's
       * rights, the second one is told that one must remain (ADM-7).
       */
      if (!isAdmin && !admins.some((admin) => admin.id !== target.id)) {
        throw new LastAdminException()
      }
      if (!admins.some((admin) => admin.id === actor.id)) {
        throw new bouncerErrors.E_AUTHORIZATION_FAILURE(AuthorizationResponse.deny())
      }

      target.useTransaction(trx)
      target.isAdmin = isAdmin
      await target.save()
    })
  }

  /**
   * Deletes an account. The database deletes in cascade what belongs to
   * it (vivariums and their data, remember me and password reset tokens)
   * and empties the "invited_by_id" of the users and invitations it sent.
   * The image files of its vivariums are deleted after the database: a
   * failure leaves orphan files, never a vivarium without its image.
   *
   * Deleting one's own account is refused, and the actor must still be an
   * administrator when the account is deleted: an administrator remains,
   * even when two of them delete each other at the same time.
   *
   * @throws OwnAccountDeletionException when the actor deletes their own account
   * @throws E_AUTHORIZATION_FAILURE when the actor was deleted or lost their rights
   */
  async delete(actor: User, target: User) {
    if (actor.id === target.id) {
      throw new OwnAccountDeletionException()
    }

    const vivariums = await db.transaction(async (trx) => {
      /**
       * The administrators stay locked until the end of the transaction,
       * in the same order as in "setAdmin": of two administrators deleting
       * each other, the second one waits, then finds that they no longer
       * exist.
       */
      const admins = await User.query({ client: trx })
        .where('is_admin', true)
        .select('id')
        .orderBy('id')
        .forUpdate()
      if (!admins.some((admin) => admin.id === actor.id)) {
        throw new bouncerErrors.E_AUTHORIZATION_FAILURE(AuthorizationResponse.deny())
      }

      target.useTransaction(trx)
      const deleted = await target.related('vivariums').query().select('id')
      await target.delete()
      return deleted
    })
    await this.vivariumImageService.deleteFilesOf(vivariums.map((vivarium) => vivarium.id))
  }
}
