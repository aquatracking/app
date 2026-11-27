import type User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'

/**
 * Management of the accounts of the instance, reserved to administrators.
 * The rules on the target account (not oneself, not the last
 * administrator) are business rules of UserAdministrationService.
 */
export default class UserPolicy extends BasePolicy {
  viewList(actor: User) {
    return actor.isAdmin
  }

  updateAdmin(actor: User, _target: User) {
    return actor.isAdmin
  }

  delete(actor: User, _target: User) {
    return actor.isAdmin
  }

  createPasswordReset(actor: User, _target: User) {
    return actor.isAdmin
  }
}
