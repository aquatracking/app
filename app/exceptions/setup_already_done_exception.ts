import { Exception } from '@adonisjs/core/exceptions'

/**
 * Raised when the setup screen is used once a user exists: the setup
 * routes then answer 404, as if they did not exist.
 */
export default class SetupAlreadyDoneException extends Exception {
  static status = 404
  static code = 'E_SETUP_ALREADY_DONE'
  static message = 'The instance is already installed'
}
