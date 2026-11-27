import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when a new order does not list exactly the tracked measures of
 * the vivarium, for instance after a change made in another tab.
 */
export default class InvalidTrackedMeasureOrderException extends NotifiedException {
  static code = 'E_INVALID_TRACKED_MEASURE_ORDER'
  static message = 'The order does not match the tracked measures'
}
