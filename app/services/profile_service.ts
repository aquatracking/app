import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { Secret } from '@adonisjs/core/helpers'

/**
 * Changes of the user's own account (docs/features/02-auth-profile.md).
 */
export class ProfileService {
  /**
   * Sets a new password, already checked against the current one by the
   * validator. The other devices kept signed in by "remember me" are
   * signed out; the current one stays signed in.
   *
   * @param currentRememberMeToken - Value of the "remember me" cookie of
   *   the current device, if it has one
   */
  async changePassword(user: User, password: string, currentRememberMeToken?: string) {
    const currentToken = currentRememberMeToken
      ? await User.rememberMeTokens.verify(new Secret(currentRememberMeToken))
      : null

    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      user.password = password
      await user.save()
      await user.deleteRememberMeTokens({
        except: currentToken?.identifier.toString(),
        client: trx,
      })
    })
  }
}
