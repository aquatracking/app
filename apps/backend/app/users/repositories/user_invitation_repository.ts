import { DateTime } from 'luxon'
import UserInvitation from '../models/user_invitation.js'

export class UserInvitationRepository {
  async getActiveInvitationForTokenAndEmail(token: string, email: string) {
    return UserInvitation.query()
      .where('token', token)
      .where('email', email)
      .where('expiresAt', '>', DateTime.utc().toSQL())
      .first()
  }

  async deleteInvitationByEmail(email: string) {
    return UserInvitation.query().where('email', email).delete()
  }
}
