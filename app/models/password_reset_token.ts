import { compose } from '@adonisjs/core/helpers'
import { PasswordResetTokenSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import { withOneTimeToken } from '#models/mixins/with_one_time_token'

/**
 * One-time link to choose a new password, valid 1 hour (docs/CONTEXT.md).
 * A user has at most one: creating one deletes the previous ones.
 */
export default class PasswordResetToken extends compose(
  PasswordResetTokenSchema,
  withUuidV7,
  withOneTimeToken
) {}
