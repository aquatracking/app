import env from '#start/env'
import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { UserModel } from '../../users/models/user.js'
import { UserRepository } from '../../users/repositories/user_repository.js'
import { EmailVerificationService } from '../../users/services/email_verification_service.js'
import { UserInvitationService } from '../../users/services/user_invitation_service.js'
import RequireInvitationException from '../exceptions/require_invitation_exception.js'
import UserAlreadyExistsException from '../exceptions/user_already_exists_exception.js'

@inject()
export class AuthenticationService {
  constructor(
    private readonly logger: Logger,
    private readonly userInvitationService: UserInvitationService,
    private readonly userRepository: UserRepository,
    private readonly emailVerificationService: EmailVerificationService
  ) {}

  private async failIfUserAlreadyExists(email: string) {
    const user = await this.userRepository.findByEmail(email)
    if (user) {
      throw new UserAlreadyExistsException(email)
    }
  }

  async register(fullName: string, email: string, password: string, invitationToken?: string) {
    if (env.get('REQUIRE_INVITATION') && !invitationToken) {
      throw new RequireInvitationException()
    }

    let user: UserModel | null = null

    if (invitationToken) {
      const invitation = await this.userInvitationService.getActiveInvitationForTokenAndEmailOrFail(
        invitationToken,
        email
      )

      await this.failIfUserAlreadyExists(email)

      user = await this.userRepository.create(fullName, email, password, true)
      this.logger.info(
        'Account created for user %s (%s) with invitation %s',
        user.email,
        user.id,
        invitation.id
      )
    } else {
      await this.failIfUserAlreadyExists(email)

      user = await this.userRepository.create(fullName, email, password, false)

      this.emailVerificationService.sendVerificationEmail(user)

      this.logger.info('Account created for user %s (%s)', user.email, user.id)
    }

    await this.userInvitationService.deleteInvitationForUser(user)

    return user
  }
}
