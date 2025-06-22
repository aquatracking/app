import { Exception } from '@adonisjs/core/exceptions'

export default class UserAlreadyExistsException extends Exception {
  static code = 'E_USER_ALREADY_EXISTS'
  static status = 409

  constructor(email: string) {
    super(UserAlreadyExistsException.message, {
      code: UserAlreadyExistsException.code,
      status: UserAlreadyExistsException.status,
    })
    this.message = `User with email ${email} already exists.`
  }
}
