import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersController {
  async index({ inertia }: HttpContext) {
    const users = await User.query().orderBy('createdAt', 'desc').exec()
    return inertia.render('admin/users/index', { users: users.map((user) => user.serialize()) })
  }
}
