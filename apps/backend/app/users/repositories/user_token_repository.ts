import { DateTime } from 'luxon'
import UserToken, { UserTokenModel } from '../models/user_token.js'

type UserTokenType = 'email_verification' | 'password_reset'

export class UserTokenRepository {
  async deleteByUserId(userId: string, type: UserTokenType): Promise<void> {
    await UserToken.query().where('user_id', userId).where('type', type).delete()
  }

  async createToken(
    userId: string,
    type: UserTokenType,
    expiresAt: DateTime,
    token: string
  ): Promise<UserTokenModel> {
    return await UserToken.create({
      userId,
      type,
      expiresAt,
      token,
    })
  }
}
