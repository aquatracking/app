import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when a password reset link is unknown, expired or already used.
 */
export default class InvalidPasswordResetTokenException extends NotifiedException {
  static code = 'E_INVALID_PASSWORD_RESET_TOKEN'
  static message = 'The password reset link is invalid or expired'
}
