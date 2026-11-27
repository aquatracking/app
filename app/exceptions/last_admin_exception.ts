import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when removing the rights of the last administrator.
 */
export default class LastAdminException extends NotifiedException {
  static code = 'E_LAST_ADMIN'
  static message = 'There must remain at least one administrator'
}
