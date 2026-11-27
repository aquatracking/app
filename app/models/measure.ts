import { belongsTo } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import MeasureType from '#models/measure_type'
import { MeasureSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Sources of a measure (docs/CONTEXT.md), mirrored by the
 * "measures_source_check" constraint. Always "manual" in 2.0.
 */
export type MeasureSource = 'manual' | 'device'

export default class Measure extends compose(MeasureSchema, withUuidV7) {
  declare source: MeasureSource

  @belongsTo(() => MeasureType)
  declare measureType: BelongsTo<typeof MeasureType>
}
