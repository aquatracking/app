import { Exception } from '@adonisjs/core/exceptions'

export default class EmailNotVerifiedException extends Exception {
  static code = 'E_EMAIL_NOT_VERIFIED'
  static status = 403
  static message = 'Email not verified. Please verify your email address.'
}
