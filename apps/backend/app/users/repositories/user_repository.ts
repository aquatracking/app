import User, { UserModel } from '../models/user.js'

export class UserRepository {
  async create(
    fullName: string,
    email: string,
    password: string,
    verified = false
  ): Promise<UserModel> {
    return User.create({
      fullName,
      email,
      password,
      verified,
    })
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return User.query().where('email', email).first()
  }
}
