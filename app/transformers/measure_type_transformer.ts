import type MeasureType from '#models/measure_type'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A measure type. Its label is the translation
 * "measure_types.<code>.label", picked by the page.
 */
export default class MeasureTypeTransformer extends BaseTransformer<MeasureType> {
  toObject() {
    return this.pick(this.resource, ['code', 'unit'])
  }

  /**
   * With the maximum precision of its values, to show them.
   */
  withDecimals() {
    return this.pick(this.resource, ['code', 'unit', 'decimals'])
  }
}
