import { Exception } from '@adonisjs/core/exceptions'

export default class RequireInvitationException extends Exception {
  static code = 'E_REQUIRE_INVITATION'
  static status = 403
  static message = 'Missing invitation token.'
}
