import env from '#start/env'
import { DateTime } from 'luxon'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import { urlFor } from '@adonisjs/core/services/url_builder'
import PasswordResetToken from '#models/password_reset_token'
import PasswordResetNotification from '#mails/password_reset_notification'
import InvalidPasswordResetTokenException from '#exceptions/invalid_password_reset_token_exception'

/**
 * Password reset links: valid 1 hour, used once, at most one per user
 * (docs/features/02-auth-profile.md).
 */
export class PasswordResetService {
  /**
   * Creates a link for the user and returns its token. The previous links
   * of the user stop working.
   */
  createToken(user: User): Promise<string> {
    const { token, tokenHash } = PasswordResetToken.generateToken()

    return db.transaction(async (trx) => {
      await PasswordResetToken.query({ client: trx }).where('userId', user.id).delete()
      await PasswordResetToken.create(
        { userId: user.id, tokenHash, expiresAt: DateTime.now().plus({ hours: 1 }) },
        { client: trx }
      )
      return token
    })
  }

  /**
   * Absolute URL of the link of a token, to send or to show.
   */
  url(token: string): string {
    return urlFor('password_reset.edit', { token }, { prefixUrl: env.get('APP_URL') })
  }

  /**
   * Creates a link for the user on behalf of an administrator, who shows
   * it to pass it on by hand. With SMTP, it is also emailed to the user.
   */
  async createLink(user: User): Promise<{ url: string; emailed: boolean }> {
    const url = this.url(await this.createToken(user))
    const emailed = app.config.get<boolean>('app.mail.enabled')
    if (emailed) {
      await mail.sendLater(new PasswordResetNotification(user, url))
    }
    return { url, emailed }
  }

  /**
   * Emails a link to the account of the email, if there is one. Nothing
   * tells the caller whether it exists. The email is queued rather than
   * sent, so that the response time does not reveal it: only the creation
   * of the link (a few milliseconds) differs.
   */
  async sendLink(email: string) {
    const user = await User.findBy('email', email)
    if (!user) {
      return
    }

    const token = await this.createToken(user)
    await mail.sendLater(new PasswordResetNotification(user, this.url(token)))
  }

  /**
   * The user of a valid link, if any.
   */
  async findUser(token: string): Promise<User | null> {
    const resetToken = await PasswordResetToken.findValidByToken(token)
    return resetToken ? User.find(resetToken.userId) : null
  }

  /**
   * Sets the new password of the link's user. The link is used up, and
   * the devices kept signed in by "remember me" are signed out.
   *
   * @throws InvalidPasswordResetTokenException when the link is unknown,
   *   expired or already used
   */
  reset(token: string, password: string): Promise<User> {
    return db.transaction(async (trx) => {
      const resetToken = await PasswordResetToken.findValidByToken(token, trx)
      if (!resetToken) {
        throw new InvalidPasswordResetTokenException()
      }

      const user = await User.findOrFail(resetToken.userId, { client: trx })
      user.password = password
      await user.save()

      await PasswordResetToken.query({ client: trx }).where('userId', user.id).delete()
      await user.deleteRememberMeTokens({ client: trx })
      return user
    })
  }
}
