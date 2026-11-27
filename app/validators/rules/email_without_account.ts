import vine from '@vinejs/vine'
import User from '#models/user'

/**
 * Accepts an email that no account uses yet (stored in lowercase).
 */
export const emailWithoutAccount = vine.createRule(
  async (value, _, field) => {
    if (typeof value !== 'string') {
      return
    }

    if (await User.findBy('email', value)) {
      field.report('An account already uses this email', 'emailWithoutAccount', field)
    }
  },
  { isAsync: true }
)
