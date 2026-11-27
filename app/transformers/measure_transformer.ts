import type Measure from '#models/measure'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A measure of a reading, its value as a number: shown without forced
 * trailing zeros. "measureType" must be preloaded. Its type is picked
 * here rather than by MeasureTypeTransformer: a reading would nest it at
 * a depth that transformers do not resolve by default.
 */
export default class MeasureTransformer extends BaseTransformer<Measure> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'value']),
      measureType: this.pick(this.resource.measureType, ['code', 'unit', 'decimals']),
    }
  }
}
