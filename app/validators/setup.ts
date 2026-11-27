import vine from '@vinejs/vine'
import { LOCALES } from '#models/user'
import { timezone } from '#validators/rules/timezone'

/**
 * Creation of the first administrator.
 */
export const setupValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().maxLength(100).optional(),
  email: vine.string().trim().email().toLowerCase(),
  password: vine.string().minLength(8).confirmed({ as: 'passwordConfirmation' }),
  /**
   * Declared so that the form knows the field: "confirmed" reports its
   * error on it.
   */
  passwordConfirmation: vine.string(),
  locale: vine.enum(LOCALES),
  timezone: vine.string().trim().use(timezone()),
})
