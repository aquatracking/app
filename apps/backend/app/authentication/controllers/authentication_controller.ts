import { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '../validators/login_validator.js'
import User from '../../users/models/user.js'
import { UserMapper } from '../../users/mappers/user_mapper.js'

export default class AuthenticationController {
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

  async logout({ auth, logger, response }: HttpContext) {
    const user = auth.user

    if (user) {
      await auth.use('web').logout()

      logger.info('User %s logged out successfully', auth)
    }

    return response.status(204)
  }
}
