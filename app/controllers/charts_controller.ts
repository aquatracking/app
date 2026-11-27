import { inject } from '@adonisjs/core'
import Vivarium from '#models/vivarium'
import { errors as lucidErrors } from '@adonisjs/lucid'
import type { HttpContext } from '@adonisjs/core/http'
import VivariumPolicy from '#policies/vivarium_policy'
import { ReadingService } from '#services/reading_service'
import VivariumTransformer from '#transformers/vivarium_transformer'
import MeasureTypeTransformer from '#transformers/measure_type_transformer'
import MeasureSeriesTransformer from '#transformers/measure_series_transformer'
import { CHART_RANGES, MeasureSeriesService } from '#services/measure_series_service'
import MeasureTypeDefinitionTransformer from '#transformers/measure_type_definition_transformer'

/**
 * Chart of a measure type of a vivarium (docs/features/07-charts.md),
 * tracked or measured only. Read-only: also on an archived vivarium.
 */
@inject()
export default class ChartsController {
  constructor(
    protected measureSeriesService: MeasureSeriesService,
    protected readingService: ReadingService
  ) {}

  async show({ params, auth, bouncer, request, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)
    const types = await this.measureSeriesService.chartTypes(vivarium, params.code)
    if (!types) {
      throw new lucidErrors.E_ROW_NOT_FOUND()
    }
    const range = MeasureSeriesService.parseRange(request.qs().range)
    const series = await this.measureSeriesService.series(vivarium, types.measureType, range, {
      timezone: auth.getUserOrFail().timezone,
    })
    const fields = vivarium.isArchived ? [] : await this.readingService.fieldTypes(vivarium)

    return inertia.render('charts/show', {
      vivarium: VivariumTransformer.transform(vivarium),
      measureType: MeasureTypeTransformer.transform(types.measureType).useVariant('withDecimals'),
      trackedTypes: MeasureTypeTransformer.transform(types.tracked),
      ranges: [...CHART_RANGES],
      series: MeasureSeriesTransformer.transform(series),
      readingFields: MeasureTypeDefinitionTransformer.transform(fields),
    })
  }
}
