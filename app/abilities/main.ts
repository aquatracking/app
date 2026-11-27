import type User from '#models/user'
import { Bouncer } from '@adonisjs/bouncer'

/**
 * Access to the administration section (docs/features/03-admin.md),
 * checked by the "admin" middleware on every "/admin" route. Each action
 * is then authorized by UserPolicy or InvitationPolicy.
 */
export const administer = Bouncer.ability((user: User) => user.isAdmin)
