import User from '#models/user'
import Invitation from '#models/invitation'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type { registrationValidator } from '#validators/auth'
import InvalidInvitationException from '#exceptions/invalid_invitation_exception'

export type RegistrationData = Infer<typeof registrationValidator>

/**
 * Account creation from an invitation, the only way to sign up
 * (ADR 0003, docs/features/02-auth-profile.md).
 */
export class RegistrationService {
  /**
   * The valid invitation of a link, if any.
   */
  findInvitation(token: string): Promise<Invitation | null> {
    return Invitation.findValidByToken(token)
  }

  /**
   * Creates the account of the invited email and deletes the invitation.
   * The invitation stays locked until the end of the transaction: of two
   * simultaneous submissions of the same link, only one creates an account.
   *
   * @throws InvalidInvitationException when the invitation is unknown,
   *   expired or already used, or when its email already has an account
   */
  register(token: string, data: RegistrationData): Promise<User> {
    return db.transaction(async (trx) => {
      const invitation = await Invitation.findValidByToken(token, trx)
      /**
       * An account may have been created with this email meanwhile (by
       * another invitation): the invitation can no longer be used.
       */
      if (!invitation || (await User.findBy('email', invitation.email, { client: trx }))) {
        throw new InvalidInvitationException()
      }

      const user = await User.create(
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: invitation.email,
          password: data.password,
          locale: data.locale,
          timezone: data.timezone,
          invitedById: invitation.invitedById,
        },
        { client: trx }
      )

      await invitation.delete()
      return user
    })
  }
}
