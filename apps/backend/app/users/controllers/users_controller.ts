import { HttpContext } from '@adonisjs/core/http'
import { UserMapper } from '../mappers/user_mapper.js'

export default class UsersController {
  async me({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    return UserMapper.toDto(user)
  }
}
