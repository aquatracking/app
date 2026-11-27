import { BaseTransformer } from '@adonisjs/core/transformers'
import type { SeriesPoint, Tile } from '#services/measure_series_service'

/**
 * A tile of the dashboard. Instants in UTC, values as numbers: shown
 * without forced trailing zeros.
 */
export default class TileTransformer extends BaseTransformer<Tile> {
  toObject() {
    const { measureType, last, variation, sparkline } = this.resource
    return {
      measureType: this.pick(measureType, ['code', 'unit', 'decimals']),
      last: last && point(last),
      variation,
      sparkline: sparkline.map(point),
    }
  }
}

export function point({ measuredAt, value }: SeriesPoint) {
  return { measuredAt: measuredAt.toUTC().toISO({ suppressMilliseconds: true })!, value }
}
