import { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '../validators/login_validator.js'
import { inject } from '@adonisjs/core'
import User from '../../users/models/user.js'
import { UserMapper } from '../../users/mappers/user_mapper.js'

@inject()
export default class AuthenticationController {
  constructor() {}

  async login({ request, logger, auth }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    logger = logger.child({
      user: {
        email,
      },
    })

    const user = await User.verifyCredentials(email, password).catch((error) => {
      if (error.code === 'E_INVALID_CREDENTIALS') {
        logger.warn('Login attempt failed for user %s: %s', email, error.message)
      } else {
        logger.error(
          'An unexpected error occurred during login for user %s: (%s) %s',
          email,
          error.code,
          error.message
        )
      }
      throw error
    })

    logger = logger.child({ user: { id: user.id, email: user.email } })

    logger.info('User %s logged in successfully', user.email)

    await auth.use('web').login(user)

    return UserMapper.toDto(user)
  }
}
