import env from '#start/env'
import { DateTime } from 'luxon'
import type User from '#models/user'
import Invitation from '#models/invitation'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import { urlFor } from '@adonisjs/core/services/url_builder'
import InvitationNotification from '#mails/invitation_notification'

/**
 * An invitation link just created or renewed: the only moment its URL is
 * known, since the token is stored hashed.
 */
export type InvitationLink = { invitation: Invitation; url: string; emailed: boolean }

/**
 * Invitations created by administrators, the only way to sign up
 * (ADR 0003, docs/features/03-admin.md).
 */
export class InvitationService {
  /**
   * Invites an email that no account uses (checked by the validator). An
   * email already invited gets its invitation renewed. With SMTP, the
   * link is also emailed, in the language of the administrator.
   */
  async invite(admin: User, email: string): Promise<InvitationLink> {
    const { token, tokenHash } = Invitation.generateToken()

    const invitation = await db.transaction(async (trx) => {
      /**
       * Two simultaneous invitations of the same email wait for each
       * other: the second renews the invitation created by the first.
       */
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [`invitation:${email}`])

      const existing = await Invitation.query({ client: trx }).where('email', email).first()
      const row = existing ?? new Invitation()
      row.useTransaction(trx)
      row.merge({
        email,
        tokenHash,
        expiresAt: DateTime.now().plus({ days: 7 }),
        invitedById: admin.id,
      })
      return row.save()
    })

    return this.link(admin, invitation, token)
  }

  /**
   * Gives the invitation a new token and 7 more days: the previous link
   * stops working. The administrator who renews becomes its author.
   */
  async renew(admin: User, invitation: Invitation): Promise<InvitationLink> {
    const { token, tokenHash } = Invitation.generateToken()
    invitation.merge({
      tokenHash,
      expiresAt: DateTime.now().plus({ days: 7 }),
      invitedById: admin.id,
    })
    await invitation.save()

    return this.link(admin, invitation, token)
  }

  /**
   * Deletes the invitation: its link stops working.
   */
  async revoke(invitation: Invitation) {
    await invitation.delete()
  }

  protected async link(admin: User, invitation: Invitation, token: string) {
    const url = urlFor('registration.create', { token }, { prefixUrl: env.get('APP_URL') })
    const emailed = app.config.get<boolean>('app.mail.enabled')
    if (emailed) {
      await mail.sendLater(new InvitationNotification(admin, invitation.email, url))
    }
    return { invitation, url, emailed }
  }
}
