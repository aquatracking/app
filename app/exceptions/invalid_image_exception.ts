import NotifiedException from '#exceptions/notified_exception'

/**
 * Raised when an uploaded vivarium image cannot be decoded, although its
 * content looks like an accepted format.
 */
export default class InvalidImageException extends NotifiedException {
  static code = 'E_INVALID_IMAGE'
  static message = 'The image cannot be read'
}
