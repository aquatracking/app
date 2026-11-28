import vine from '@vinejs/vine'
import type User from '#models/user'
import { identity, newPassword } from '#validators/user'
import { currentPassword } from '#validators/rules/current_password'

/**
 * Profile form. The email is not part of it: it cannot be changed in 2.0,
 * so a submitted email is dropped by the validation.
 */
export const updateProfileValidator = vine.create(identity())

/**
 * Password change, which requires the current password of the user.
 */
export const updatePasswordValidator = vine.withMetaData<{ user: User }>().create({
  currentPassword: vine.string().use(currentPassword()),
  ...newPassword(),
})
