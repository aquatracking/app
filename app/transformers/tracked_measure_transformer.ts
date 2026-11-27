import type TrackedMeasure from '#models/tracked_measure'
import { BaseTransformer } from '@adonisjs/core/transformers'
import MeasureTypeTransformer from '#transformers/measure_type_transformer'

/**
 * A tracked measure, in the order of its vivarium. "measureType" must be
 * preloaded.
 */
export default class TrackedMeasureTransformer extends BaseTransformer<TrackedMeasure> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id']),
      measureType: MeasureTypeTransformer.transform(this.resource.measureType),
    }
  }
}
