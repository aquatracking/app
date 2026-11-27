import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when an invitation link is unknown, expired or already used.
 */
export default class InvalidInvitationException extends NotifiedException {
  static code = 'E_INVALID_INVITATION'
  static message = 'The invitation is invalid or expired'
}
