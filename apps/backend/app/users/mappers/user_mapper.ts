import { UserModel } from '../models/user.js'

export class UserMapper {
  static toDto(user: UserModel) {
    const createdAt = user.createdAt.toISO()
    if (!createdAt) {
      throw new Error('createdAt is not a valid ISO date')
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      verified: user.verified,
      isAdmin: user.isAdmin,
      createdAt,
      updatedAt: user.updatedAt?.toISO() || null,
    }
  }
}
