import { DateTime } from 'luxon'
import UserToken, { UserTokenModel } from '../models/user_token.js'
import User from '../models/user.js'

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

  async getActiveByToken(token: string, type: UserTokenType): Promise<UserTokenModel | null> {
    return await UserToken.query()
      .where('token', token)
      .where('type', type)
      .where('expiresAt', '>', DateTime.utc().toSQL())
      .first()
  }

  async getUserByUserToken(userToken: UserTokenModel): Promise<User> {
    return await User.query().where('id', userToken.userId).firstOrFail()
  }
}
