import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidInvitationException extends Exception {
  static code = 'E_INVALID_INVITATION'
  static status = 403
  static message = 'The provided invitation token is invalid or has expired.'
}
