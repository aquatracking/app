import { BaseTransformer } from '@adonisjs/core/transformers'
import type { MeasureTypeDefinition } from '#catalog/measure_types'

/**
 * The rules of a catalog entry that a reading form needs: unit, maximum
 * decimals and bounds of plausibility, also checked by the server.
 */
export default class MeasureTypeDefinitionTransformer extends BaseTransformer<MeasureTypeDefinition> {
  toObject() {
    return this.pick(this.resource, ['code', 'unit', 'decimals', 'min', 'max'])
  }
}
