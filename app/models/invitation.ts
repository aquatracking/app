import { InvitationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import { withOneTimeToken } from '#models/mixins/with_one_time_token'

/**
 * One-time link that lets an email address create an account, valid
 * 7 days (docs/CONTEXT.md). Created by an administrator (feature 03),
 * deleted once used.
 */
export default class Invitation extends compose(InvitationSchema, withUuidV7, withOneTimeToken) {}
