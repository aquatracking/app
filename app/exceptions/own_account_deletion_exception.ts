import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when administrators delete their own account from the administration.
 */
export default class OwnAccountDeletionException extends NotifiedException {
  static code = 'E_OWN_ACCOUNT_DELETION'
  static message = 'Administrators cannot delete their own account'
}
