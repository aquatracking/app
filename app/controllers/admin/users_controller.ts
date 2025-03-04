import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersController {
  async index({ inertia, request }: HttpContext) {
    const page = request.input('page', 1)

    console.log(page)

    let users = await User.query().orderBy('createdAt', 'desc').paginate(page, 2)

    return inertia.render('admin/users/index', { users: users.serialize() })
  }
}
