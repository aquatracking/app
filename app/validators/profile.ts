import vine from '@vinejs/vine'
import type User from '#models/user'
import { LOCALES } from '#models/user'
import { timezone } from '#validators/rules/timezone'
import { currentPassword } from '#validators/rules/current_password'

/**
 * Profile form. The email is not part of it: it cannot be changed in 2.0,
 * so a submitted email is dropped by the validation.
 */
export const updateProfileValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().maxLength(100).nullable(),
  locale: vine.enum(LOCALES),
  timezone: vine.string().trim().use(timezone()),
})

/**
 * Password change, which requires the current password of the user.
 */
export const updatePasswordValidator = vine.withMetaData<{ user: User }>().create({
  currentPassword: vine.string().use(currentPassword()),
  password: vine.string().minLength(8).confirmed({ as: 'passwordConfirmation' }),
  passwordConfirmation: vine.string(),
})
