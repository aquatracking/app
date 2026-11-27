import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when adding a type that the vivarium already tracks.
 */
export default class TrackedMeasureAlreadyExistsException extends NotifiedException {
  static code = 'E_TRACKED_MEASURE_ALREADY_EXISTS'
  static message = 'This measure type is already tracked'
}
