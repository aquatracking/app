import vine from '@vinejs/vine'
import { LOCALES } from '#models/user'
import { timezone } from '#validators/rules/timezone'

/**
 * New password, with its confirmation. "passwordConfirmation" is declared
 * so that the form knows the field: "confirmed" reports its error on it.
 */
const newPassword = {
  password: vine.string().minLength(8).confirmed({ as: 'passwordConfirmation' }),
  passwordConfirmation: vine.string(),
}

/**
 * Login form. The email is compared in lowercase, as stored.
 */
export const loginValidator = vine.create({
  email: vine.string().trim().maxLength(254).toLowerCase(),
  password: vine.string(),
  rememberMe: vine.boolean().optional(),
})

/**
 * Account creation from an invitation. The email is the invitation's.
 */
export const registrationValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().maxLength(100).optional(),
  ...newPassword,
  locale: vine.enum(LOCALES),
  timezone: vine.string().trim().use(timezone()),
})

/**
 * Request of a password reset link.
 */
export const forgotPasswordValidator = vine.create({
  email: vine.string().trim().email().toLowerCase(),
})

/**
 * New password chosen from a password reset link.
 */
export const resetPasswordValidator = vine.create({
  ...newPassword,
})
