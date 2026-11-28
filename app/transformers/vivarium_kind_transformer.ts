import { BaseTransformer } from '@adonisjs/core/transformers'
import { hasClimate, hasWaterType, type VivariumKind } from '#models/vivarium'

/**
 * A kind of vivarium and whether it has a water type and a climate: the
 * form shows these fields from the rule of the server, which it does not
 * copy.
 */
export default class VivariumKindTransformer extends BaseTransformer<VivariumKind> {
  toObject() {
    return {
      kind: this.resource,
      hasWaterType: hasWaterType(this.resource),
      hasClimate: hasClimate(this.resource),
    }
  }
}
