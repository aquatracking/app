import { inject } from '@adonisjs/core'
import string from '@adonisjs/core/helpers/string'
import { DateTime, DurationLike } from 'luxon'
import { UserModel } from '../models/user.js'
import { UserTokenModel } from '../models/user_token.js'
import { UserTokenRepository } from '../repositories/user_token_repository.js'
import i18nManager from '@adonisjs/i18n/services/main'
import env from '#start/env'
import mail from '@adonisjs/mail/services/main'
import InvalidVerifyEmailTokenException from '../exceptions/invalid_verify_email_token_exception.js'
import { UserRepository } from '../repositories/user_repository.js'

const TOKEN_TYPE = 'email_verification'
const TOKEN_SIZE = 64
const TOKEN_DURATION: DurationLike = { days: 1 }
// TODO: Change when verification route is implemented
const baseLink = `${env.get('BASE_URL')}/verify-email`

@inject()
export class EmailVerificationService {
  constructor(
    private readonly userTokenRepository: UserTokenRepository,
    private readonly userRepository: UserRepository
  ) {}

  async sendVerificationEmail(user: UserModel): Promise<void> {
    const i18n = i18nManager.locale()

    await this.cleanUserVerificationTokens(user)

    const token = await this.generateToken(user)

    const verificationLink = `${baseLink}?token=${token.token}`

    await mail.sendLater((message) => {
      message
        .to(user.email)
        .subject(i18n.t('email.verifyYourEmail.subject'))
        .text(i18n.t('email.verifyYourEmail.text', { fullName: user.fullName, verificationLink }))
    })
  }

  async cleanUserVerificationTokens(user: UserModel): Promise<void> {
    await this.userTokenRepository.deleteByUserId(user.id, TOKEN_TYPE)
  }

  async generateToken(user: UserModel): Promise<UserTokenModel> {
    return this.userTokenRepository.createToken(
      user.id,
      TOKEN_TYPE,
      DateTime.now().plus(TOKEN_DURATION),
      string.generateRandom(TOKEN_SIZE)
    )
  }

  async verifyToken(token: string): Promise<UserModel> {
    const userToken = await this.userTokenRepository.getActiveByToken(token, TOKEN_TYPE)

    if (!userToken) {
      throw new InvalidVerifyEmailTokenException()
    }

    const user = await this.userTokenRepository.getUserByUserToken(userToken)

    this.cleanUserVerificationTokens(user)
    this.userRepository.verifyEmail(user.id)

    return user
  }
}
