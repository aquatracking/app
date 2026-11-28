import { iso, point } from '#helpers/instants'
import { BaseTransformer } from '@adonisjs/core/transformers'
import MeasureTypeTransformer from '#transformers/measure_type_transformer'
import type { Tile } from '#services/measure_series_service'

/**
 * A tile of the dashboard. Instants in UTC, values as numbers: shown
 * without forced trailing zeros. The sparkline carries the bounds of the
 * 30d range, its time axis.
 */
export default class TileTransformer extends BaseTransformer<Tile> {
  toObject() {
    const { measureType, last, variation, sparkline } = this.resource
    return {
      measureType: MeasureTypeTransformer.transform(measureType).useVariant('withDecimals'),
      last: last && point(last),
      variation,
      sparkline: {
        start: iso(sparkline.start),
        end: iso(sparkline.end),
        points: sparkline.points.map(point),
      },
    }
  }
}
