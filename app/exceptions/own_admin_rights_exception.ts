import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when administrators remove their own rights.
 */
export default class OwnAdminRightsException extends NotifiedException {
  static code = 'E_OWN_ADMIN_RIGHTS'
  static message = 'Administrators cannot remove their own rights'
}
