import vine from '@vinejs/vine'
import type User from '#models/user'
import hash from '@adonisjs/core/services/hash'

/**
 * Accepts the current password of the user given in the metadata of the
 * validator ("meta.user").
 */
export const currentPassword = vine.createRule(
  async (value, _, field) => {
    if (typeof value !== 'string') {
      return
    }

    const user = field.meta.user as User
    if (!(await hash.verify(user.password, value))) {
      field.report('The {{ field }} field must be the current password', 'currentPassword', field)
    }
  },
  { isAsync: true }
)
