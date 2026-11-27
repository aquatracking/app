import { DateTime } from 'luxon'
import Invitation from '#models/invitation'
import factory from '@adonisjs/lucid/factories'

/**
 * Pending invitations of the tests. The token of the link is not known:
 * merge the "tokenHash" of a token from "Invitation.generateToken()" to
 * open the link.
 */
export const InvitationFactory = factory
  .define(Invitation, ({ faker }) => {
    return {
      email: faker.internet.email().toLowerCase(),
      tokenHash: Invitation.generateToken().tokenHash,
      expiresAt: DateTime.now().plus({ days: 7 }),
    }
  })
  .state('expired', (invitation) => {
    invitation.expiresAt = DateTime.now().minus({ minutes: 1 })
  })
  .build()
