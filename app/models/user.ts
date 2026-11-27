import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Interface languages, mirrored by the "users_locale_check" constraint
 * and the supported locales of config/i18n.ts.
 */
export const LOCALES = ['en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

/**
 * The last activity is known to the hour (docs/CONTEXT.md).
 */
const LAST_SEEN_PRECISION = { hours: 1 }

export default class User extends compose(UserSchema, withUuidV7, withAuthFinder(hash)) {
  declare locale: Locale

  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  /**
   * Signs the user out of the devices kept signed in by "remember me",
   * except the one of the given token. Only the sessions restored from
   * these tokens end: the current browser sessions run until closed.
   */
  async deleteRememberMeTokens(
    options: { except?: string | number; client?: TransactionClientContract } = {}
  ) {
    const query = (options.client ?? db).from('remember_me_tokens').where('tokenable_id', this.id)
    if (options.except !== undefined) {
      query.whereNot('id', options.except)
    }
    await query.delete()
  }

  /**
   * Records that the user is using the application, at most once per
   * hour. The conditional update never touches "updated_at", which
   * tracks changes of the account, not its use.
   */
  async recordActivity() {
    const threshold = DateTime.now().minus(LAST_SEEN_PRECISION)
    if (this.lastSeenAt && this.lastSeenAt > threshold) {
      return
    }

    const now = DateTime.now()
    await User.query()
      .where('id', this.id)
      .where((query) => {
        query.whereNull('last_seen_at').orWhere('last_seen_at', '<=', threshold.toSQL()!)
      })
      .update({ last_seen_at: now.toSQL() })
    this.lastSeenAt = now
  }
}
