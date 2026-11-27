import User from '#models/user'
import { InvitationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { withOneTimeToken } from '#models/mixins/with_one_time_token'

/**
 * One-time link that lets an email address create an account, valid
 * 7 days (docs/CONTEXT.md). Created by an administrator (feature 03),
 * deleted once used.
 */
export default class Invitation extends compose(InvitationSchema, withUuidV7, withOneTimeToken) {
  /**
   * Administrator who sent (or last renewed) the invitation. None when
   * that administrator was deleted.
   */
  @belongsTo(() => User, { foreignKey: 'invitedById' })
  declare invitedBy: BelongsTo<typeof User>
}
