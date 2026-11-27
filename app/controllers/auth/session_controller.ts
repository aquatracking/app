import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator } from '#validators/auth'
import { LoginService } from '#services/login_service'

/**
 * Login and logout (docs/features/02-auth-profile.md).
 */
export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  /**
   * Signs the user in, then goes to the page they asked for before being
   * sent to the login page, or home.
   */
  @inject()
  async store({ request, auth, response }: HttpContext, loginService: LoginService) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)
    const user = await loginService.attempt(email, password, request.ip())

    await auth.use('web').login(user, rememberMe === true)
    return response.redirect().toIntendedRoute('home')
  }

  /**
   * Empties the session and deletes the "remember me" token of the device.
   */
  async destroy({ auth, session, response }: HttpContext) {
    await auth.use('web').logout()
    session.clear()
    return response.redirect().toRoute('session.create')
  }
}
