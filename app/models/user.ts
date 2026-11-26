import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

/**
 * Interface languages, mirrored by the "users_locale_check" constraint
 * and the supported locales of config/i18n.ts.
 */
export const LOCALES = ['en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

export default class User extends compose(UserSchema, withUuidV7, withAuthFinder(hash)) {
  declare locale: Locale
}
