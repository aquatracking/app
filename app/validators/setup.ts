import vine from '@vinejs/vine'
import { email, identity, newPassword } from '#validators/user'

/**
 * Creation of the first administrator.
 */
export const setupValidator = vine.create({
  ...identity(),
  email: email(),
  ...newPassword(),
})
