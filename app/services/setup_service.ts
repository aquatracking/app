import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type { setupValidator } from '#validators/setup'
import SetupAlreadyDoneException from '#exceptions/setup_already_done_exception'

export type SetupData = Infer<typeof setupValidator>

/**
 * Installation of the instance: it lasts as long as no user exists, and
 * ends with the creation of the first administrator
 * (docs/features/01-installation.md).
 */
export class SetupService {
  /**
   * An installed instance never goes back to setup (there is always at
   * least one administrator), so "done" is remembered for the life of the
   * process and the database is no longer queried. "Not done" is never
   * remembered: another process may have completed the installation.
   */
  static #done = false

  async isDone(): Promise<boolean> {
    if (!SetupService.#done) {
      SetupService.#done = (await User.query().select('id').first()) !== null
    }
    return SetupService.#done
  }

  /**
   * Forgets the remembered state. For tests, which empty the database
   * between two cases.
   */
  static forget() {
    SetupService.#done = false
  }

  /**
   * Creates the first administrator. The "no user yet" check and the
   * insertion run in one transaction holding a lock on "users" that
   * blocks concurrent insertions: of two simultaneous submissions, the
   * second one waits, then sees the administrator created by the first.
   */
  async createAdmin(data: SetupData): Promise<User> {
    const admin = await db.transaction(async (trx) => {
      await trx.rawQuery('LOCK TABLE users IN EXCLUSIVE MODE')

      if (await User.query({ client: trx }).select('id').first()) {
        throw new SetupAlreadyDoneException()
      }

      return User.create(
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          locale: data.locale,
          timezone: data.timezone,
          isAdmin: true,
        },
        { client: trx }
      )
    })

    SetupService.#done = true
    return admin
  }
}
