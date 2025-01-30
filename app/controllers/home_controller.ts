import { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ inertia, auth }: HttpContext) {
    const biotopes = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .orderBy('type')
      .orderBy('name')

    return inertia.render('home', {
      biotopes: biotopes.map((biotope) => biotope.serialize()),
    })
  }
}
