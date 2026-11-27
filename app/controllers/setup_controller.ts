import { inject } from '@adonisjs/core'
import { setupValidator } from '#validators/setup'
import type { HttpContext } from '@adonisjs/core/http'
import { SetupService } from '#services/setup_service'

/**
 * Setup screen: creation of the first administrator. The setup middleware
 * makes these routes answer 404 once the instance is installed.
 */
export default class SetupController {
  async show({ inertia }: HttpContext) {
    return inertia.render('setup/show', {})
  }

  @inject()
  async store({ request, auth, response }: HttpContext, setupService: SetupService) {
    const data = await request.validateUsing(setupValidator)
    const admin = await setupService.createAdmin(data)

    await auth.use('web').login(admin)
    return response.redirect().toRoute('home')
  }
}
