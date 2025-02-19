import { biotopeCreateValidator } from '#validators/biotope_create_validator'
import { biotopeUpdateValidator } from '#validators/biotope_update_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class BiotopesController {
  /**
   * Display a list of resource
   */
  async index({ response }: HttpContext) {
    return response.redirect().toRoute('home')
  }

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('biotopes/create')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, auth, i18n, session, response }: HttpContext) {
    const biotopeToCreate = await request.validateUsing(biotopeCreateValidator)

    const biotope = await auth.getUserOrFail().related('biotopes').create(biotopeToCreate)

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.biotopeCreated', { name: biotope.name }),
    })

    return response.redirect().toRoute('home')
  }

  /**
   * Show individual record
   */
  async show({ params, inertia, auth }: HttpContext) {
    const biotope = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .where('id', params.id)
      .firstOrFail()

    return inertia.render('biotopes/show', {
      biotope: biotope.serialize(),
    })
  }

  /**
   * Edit individual record
   */
  async edit({ params, inertia, auth }: HttpContext) {
    const biotope = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .where('id', params.id)
      .firstOrFail()

    return inertia.render('biotopes/edit', {
      biotope: biotope.serialize(),
    })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, auth, request, session, i18n, response }: HttpContext) {
    const { name, description, volume, saltwater } =
      await request.validateUsing(biotopeUpdateValidator)

    const biotope = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .where('id', params.id)
      .firstOrFail()

    biotope.merge({
      name,
      description,
      volume,
      saltwater,
    })

    await biotope.save()

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.biotopeUpdated', { name: biotope.name }),
    })

    return response.redirect().toRoute('biotopes.show', { id: biotope.id })
  }

  /**
   * Delete record
   */
  async destroy({ params, auth, response, session, i18n }: HttpContext) {
    // Delete
    const biotope = await auth
      .getUserOrFail()
      .related('biotopes')
      .query()
      .where('id', params.id)
      .firstOrFail()

    await biotope.delete()

    session.flash('notification', {
      type: 'success',
      message: i18n.t('notifications.biotopeDeleted', { name: biotope.name }),
    })

    // Redirect
    return response.redirect().toRoute('home')
  }
}
