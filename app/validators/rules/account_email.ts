import vine from '@vinejs/vine'

/**
 * Accepts only the email of the account given in the metadata of the
 * validator ("meta.email"), typed to confirm an action on that account.
 */
export const accountEmail = vine.createRule((value, _, field) => {
  if (typeof value !== 'string') {
    return
  }

  if (value !== field.meta.email) {
    field.report('The {{ field }} field must be the email of the account', 'accountEmail', field)
  }
})
