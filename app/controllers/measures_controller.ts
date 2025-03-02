import { measureCreateValidator } from '#validators/measure_create_validator'
import { HttpContext } from '@adonisjs/core/http'

export default class MeasuresController {
  /**
   * Handle form submission for the create action
   */
  async store({ request, auth, params, response, session, i18n }: HttpContext) {
    const measureToCreate = await request.validateUsing(measureCreateValidator)

    const biotope = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .where('id', params.biotope_id)
      .firstOrFail()

    await biotope.related('measures').create(measureToCreate)

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.measureCreated'),
    })

    return response.redirect().toRoute('biotopes.show', { id: params.biotope_id })
  }
}
