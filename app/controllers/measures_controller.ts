import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import Vivarium from '#models/vivarium'
import { errors as lucidErrors } from '@adonisjs/lucid'
import { readingValidator } from '#validators/reading'
import type { HttpContext } from '@adonisjs/core/http'
import VivariumPolicy from '#policies/vivarium_policy'
import ReadingTransformer from '#transformers/reading_transformer'
import VivariumTransformer from '#transformers/vivarium_transformer'
import MeasureTypeTransformer from '#transformers/measure_type_transformer'
import { ReadingService, type Reading } from '#services/reading_service'
import MeasureTypeDefinitionTransformer from '#transformers/measure_type_definition_transformer'

/**
 * Readings and history of a vivarium (docs/features/06-measures.md). A
 * reading is created, edited and deleted as a whole, identified by its
 * instant in the URL: there is no route for one measure. No change on an
 * archived vivarium.
 */
@inject()
export default class MeasuresController {
  constructor(protected readingService: ReadingService) {}

  /**
   * Saves the reading form of the dashboard, then goes back to it.
   */
  async storeReading({ params, auth, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const data = await request.validateUsing(readingValidator, {
      meta: await this.validationMeta(auth.getUserOrFail().timezone, vivarium),
    })

    const measures = await this.readingService.create(vivarium, data)

    session.notify('success', i18n.t('measures.reading.created', { count: measures.length }))
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  /**
   * History: a page of readings, optionally filtered by type ("?type=").
   */
  async index({ params, bouncer, request, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)

    return inertia.render('measures/index', {
      ...(await this.historyProps(vivarium, request.qs())),
      editedReading: null,
      fields: [],
    })
  }

  /**
   * The history with the form of one of its readings open.
   */
  async editReading({ params, auth, bouncer, request, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const reading = await this.findReadingOrFail(vivarium, params.measuredAt)
    const fields = await this.readingService.fieldTypes(vivarium, reading)

    return inertia.render('measures/index', {
      ...(await this.historyProps(vivarium, request.qs())),
      editedReading: ReadingTransformer.transform(
        reading,
        auth.getUserOrFail().timezone
      ).useVariant('forEdit'),
      fields: MeasureTypeDefinitionTransformer.transform(fields),
    })
  }

  /**
   * Saves the edited reading, then goes back to the history, with the
   * same filter and page.
   */
  async updateReading({ params, auth, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const reading = await this.findReadingOrFail(vivarium, params.measuredAt)
    const data = await request.validateUsing(readingValidator, {
      meta: await this.validationMeta(auth.getUserOrFail().timezone, vivarium, reading),
    })

    await this.readingService.update(vivarium, reading, data)

    session.notify('success', i18n.t('measures.reading.updated'))
    return response
      .redirect()
      .toRoute('measures.index', { id: vivarium.id }, { qs: this.historyQs(request.qs()) })
  }

  async destroyReading({ params, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const reading = await this.findReadingOrFail(vivarium, params.measuredAt)

    const count = await this.readingService.destroy(vivarium, reading)

    session.notify('success', i18n.t('measures.reading.deleted', { count }))
    return response
      .redirect()
      .toRoute('measures.index', { id: vivarium.id }, { qs: this.historyQs(request.qs()) })
  }

  /**
   * The reading of the vivarium at the instant of the URL, or a 404 when
   * it has no measure then.
   */
  private async findReadingOrFail(vivarium: Vivarium, measuredAt: string) {
    const instant = DateTime.fromISO(measuredAt, { zone: 'utc' })
    const reading = instant.isValid ? await this.readingService.find(vivarium, instant) : null
    if (!reading) {
      throw new lucidErrors.E_ROW_NOT_FOUND()
    }
    return reading
  }

  private async validationMeta(timezone: string, vivarium: Vivarium, reading?: Reading) {
    return {
      timezone,
      startedOn: vivarium.startedOn.toISODate()!,
      measureTypes: await this.readingService.fieldTypes(vivarium, reading),
    }
  }

  /**
   * Filter and page of the history in the query string. A missing or
   * invalid page is the first one.
   */
  private historyQs(qs: Record<string, unknown>) {
    const page = Number.parseInt(String(qs.page ?? ''), 10)
    const type = typeof qs.type === 'string' && qs.type !== '' ? qs.type : null
    return {
      ...(type ? { type } : {}),
      ...(Number.isInteger(page) && page > 1 ? { page } : {}),
    }
  }

  private async historyProps(vivarium: Vivarium, qs: Record<string, unknown>) {
    const { type = null, page = 1 } = this.historyQs(qs)
    const { readings, meta } = await this.readingService.history(vivarium, { page, code: type })
    const measuredTypes = await this.readingService.measuredTypes(vivarium)

    return {
      vivarium: VivariumTransformer.transform(vivarium),
      readings: ReadingTransformer.paginate(readings, meta),
      measuredTypes: MeasureTypeTransformer.transform(measuredTypes),
      type,
    }
  }
}
