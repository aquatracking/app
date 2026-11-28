import vine from '@vinejs/vine'
import { LOCALES } from '#models/user'
import { timezone } from '#validators/rules/timezone'

/**
 * Fields of a user shared by the setup, registration, profile, password
 * and invitation forms (docs/features/02-auth-profile.md). Functions, so
 * that a validator which adds a rule does not change the others.
 */

/**
 * An email, stored in lowercase like the emails of the accounts. The length
 * is checked first: the format check refuses a long email too, with a
 * less helpful message.
 */
export function email() {
  return vine.string().trim().maxLength(254).email().toLowerCase()
}

/**
 * New password, with its confirmation. "passwordConfirmation" is declared
 * so that the form knows the field: "confirmed" reports its error on it.
 */
export function newPassword() {
  return {
    password: vine.string().minLength(8).confirmed({ as: 'passwordConfirmation' }),
    passwordConfirmation: vine.string(),
  }
}

/**
 * Name, language and time zone. The last name is optional: an empty one
 * arrives as null (the bodyparser trims the fields and turns empty strings
 * into null), a missing one leaves the profile unchanged.
 */
export function identity() {
  return {
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().maxLength(100).nullable().optional(),
    locale: vine.enum(LOCALES),
    timezone: vine.string().trim().use(timezone()),
  }
}
