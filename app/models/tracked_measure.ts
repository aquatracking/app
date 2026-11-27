import { belongsTo } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import MeasureType from '#models/measure_type'
import { TrackedMeasureSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class TrackedMeasure extends compose(TrackedMeasureSchema, withUuidV7) {
  @belongsTo(() => MeasureType)
  declare measureType: BelongsTo<typeof MeasureType>
}
