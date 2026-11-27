import vine from '@vinejs/vine'
import { accountEmail } from '#validators/rules/account_email'
import { emailWithoutAccount } from '#validators/rules/email_without_account'

/**
 * Invitation of an email that no account uses. The email is stored in
 * lowercase, like the emails of the accounts.
 */
export const createInvitationValidator = vine.create({
  email: vine.string().trim().email().maxLength(254).toLowerCase().use(emailWithoutAccount()),
})

/**
 * Naming or removing an administrator.
 */
export const updateAdminValidator = vine.create({
  isAdmin: vine.boolean(),
})

/**
 * Deletion of an account, confirmed by typing its email ("meta.email").
 */
export const deleteUserValidator = vine.withMetaData<{ email: string }>().create({
  email: vine.string().trim().toLowerCase().use(accountEmail()),
})
