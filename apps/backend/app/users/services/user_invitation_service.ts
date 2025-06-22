import { inject } from '@adonisjs/core'
import InvalidInvitationException from '../exceptions/invalid_invitation_exception.js'
import { UserInvitationRepository } from '../repositories/user_invitation_repository.js'
import { UserModel } from '../models/user.js'

@inject()
export class UserInvitationService {
  constructor(private readonly userInvitationRepository: UserInvitationRepository) {}

  async getActiveInvitationForTokenAndEmailOrFail(token: string, email: string) {
    const invitation = await this.userInvitationRepository.getActiveInvitationForTokenAndEmail(
      token,
      email
    )

    if (!invitation) {
      throw new InvalidInvitationException()
    }

    return invitation
  }

  async deleteInvitationForUser(user: UserModel) {
    return this.userInvitationRepository.deleteInvitationByEmail(user.email)
  }
}
