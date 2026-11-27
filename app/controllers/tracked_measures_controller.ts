import { inject } from '@adonisjs/core'
import Vivarium from '#models/vivarium'
import type { HttpContext } from '@adonisjs/core/http'
import TrackedMeasure from '#models/tracked_measure'
import VivariumPolicy from '#policies/vivarium_policy'
import { MeasureTypeCatalog } from '#catalog/measure_types'
import type { Notification } from '#middleware/inertia_middleware'
import VivariumTransformer from '#transformers/vivarium_transformer'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import MeasureTypeTransformer from '#transformers/measure_type_transformer'
import TrackedMeasureTransformer from '#transformers/tracked_measure_transformer'
import {
  addTrackedMeasureValidator,
  reorderTrackedMeasuresValidator,
} from '#validators/tracked_measure'

/**
 * The tracked measures of a vivarium (docs/features/05-tracked-measures.md).
 * Read-only on an archived vivarium.
 */
@inject()
export default class TrackedMeasuresController {
  constructor(
    protected trackedMeasureService: TrackedMeasureService,
    protected catalog: MeasureTypeCatalog
  ) {}

  async index({ params, bouncer, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)

    const trackedMeasures = await this.trackedMeasureService.list(vivarium)
    const addableTypes = vivarium.isArchived
      ? []
      : await this.trackedMeasureService.addableTypes(vivarium)

    return inertia.render('tracked_measures/index', {
      vivarium: VivariumTransformer.transform(vivarium),
      trackedMeasures: TrackedMeasureTransformer.transform(trackedMeasures),
      addableTypes: MeasureTypeTransformer.transform(addableTypes),
    })
  }

  async store({ params, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const { code } = await request.validateUsing(addTrackedMeasureValidator, {
      meta: { offeredCodes: this.catalog.offered().map((entry) => entry.code) },
    })

    await this.trackedMeasureService.add(vivarium, code)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('tracked_measures.added', {
        name: i18n.t(`measure_types.${code}.label`),
      }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('tracked_measures.index', { id: vivarium.id })
  }

  async reorder({ params, bouncer, request, response }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const { ids } = await request.validateUsing(reorderTrackedMeasuresValidator)

    await this.trackedMeasureService.reorder(vivarium, ids)

    return response.redirect().toRoute('tracked_measures.index', { id: vivarium.id })
  }

  /**
   * Stops tracking a type. Its measures are kept.
   */
  async destroy({ params, bouncer, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const trackedMeasure = await TrackedMeasure.query()
      .where('vivarium_id', vivarium.id)
      .where('id', params.trackedMeasureId)
      .preload('measureType')
      .firstOrFail()

    await this.trackedMeasureService.remove(trackedMeasure)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('tracked_measures.removed', {
        name: i18n.t(`measure_types.${trackedMeasure.measureType.code}.label`),
      }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('tracked_measures.index', { id: vivarium.id })
  }
}
