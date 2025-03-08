import User from '#models/user'
import UserInvitation from '#models/user_invitation'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersController {
  async index({ inertia }: HttpContext) {
    const users = await User.query().orderBy('createdAt', 'desc').exec()
    const invitations = await UserInvitation.query().orderBy('createdAt', 'desc').exec()

    return inertia.render('admin/users/index', {
      users: users.map((user) => user.serialize()),
      invitations: invitations.map((invitation) => invitation.serialize()),
    })
  }
}
