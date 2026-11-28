import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when the vivarium was archived after VivariumPolicy authorized
 * the change, while the request was under way. Same notification as the
 * refusal of the policy ("errors.E_VIVARIUM_ARCHIVED").
 */
export default class ArchivedVivariumException extends NotifiedException {
  static code = 'E_VIVARIUM_ARCHIVED'
  static message = 'This vivarium is archived'
}
