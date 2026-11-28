import type { DateTime } from 'luxon'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { SeriesPoint, Tile } from '#services/measure_series_service'

/**
 * A tile of the dashboard. Instants in UTC, values as numbers: shown
 * without forced trailing zeros. The sparkline carries the bounds of the
 * 30d range, its time axis.
 */
export default class TileTransformer extends BaseTransformer<Tile> {
  toObject() {
    const { measureType, last, variation, sparkline } = this.resource
    return {
      measureType: this.pick(measureType, ['code', 'unit', 'decimals']),
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

export function iso(instant: DateTime) {
  return instant.toUTC().toISO({ suppressMilliseconds: true })!
}

export function point({ measuredAt, value }: SeriesPoint) {
  return { measuredAt: iso(measuredAt), value }
}
