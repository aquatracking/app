import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidVerifyEmailTokenException extends Exception {
  static code = 'E_INVALID_VERIFY_EMAIL_TOKEN'
  static status = 400
  static message = 'The provided email verification token is invalid or has expired.'
}
