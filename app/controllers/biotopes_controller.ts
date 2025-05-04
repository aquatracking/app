import { biotopeCreateValidator } from '#validators/biotope_create_validator'
import { biotopeUpdateValidator } from '#validators/biotope_update_validator'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { MeasureTypes } from '../constant.js'
import { BiotopeDto } from '../dto/biotope_dto.js'

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

    const availableMeasureTypes = MeasureTypes.filter((type) =>
      [...type.recommendedBiotopes].includes(biotope.type)
    )

    const rawLastValues: {
      measure_type_code: string
      value: number
      measured_at: Date
    }[][] = await db
      .rawQuery(
        `
      WITH last_values AS (
        SELECT
          measure_type_code,
          value,
          measured_at,
          ROW_NUMBER() OVER (PARTITION BY measure_type_code ORDER BY measured_at DESC) AS rn
        FROM measures
        WHERE biotope_id = :biotopeId
      )
      SELECT
        measure_type_code,
        value,
        measured_at
      FROM last_values
      WHERE rn = 1
      ORDER BY measure_type_code;
      `,
        {
          biotopeId: biotope.id,
        }
      )
      .debug(true)

    let measures = availableMeasureTypes
      .map((measureType) => {
        const last = rawLastValues[0].find(
          (measure) => measure.measure_type_code === measureType.code
        )
        return {
          type: measureType,
          last: last
            ? {
                measureTypeCode: last.measure_type_code,
                value: last.value,
                measuredAt: last.measured_at,
              }
            : null,
        }
      })
      .filter((measure) => measure.last)

    return inertia.render('biotopes/show', {
      biotope: biotope.serialize() as BiotopeDto,
      measures,
      availableMeasureTypes,
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
