import vine from '@vinejs/vine'
import { email, identity, newPassword } from '#validators/user'

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
  ...identity(),
  ...newPassword(),
})

/**
 * Request of a password reset link.
 */
export const forgotPasswordValidator = vine.create({
  email: email(),
})

/**
 * New password chosen from a password reset link.
 */
export const resetPasswordValidator = vine.create({
  ...newPassword(),
})
