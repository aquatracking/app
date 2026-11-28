import { iso, point } from '#transformers/tile_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { MeasureSeries } from '#services/measure_series_service'

/**
 * The series and statistics of a chart. Instants in UTC: the page shows
 * them in the time zone of the user.
 */
export default class MeasureSeriesTransformer extends BaseTransformer<MeasureSeries> {
  toObject() {
    const { range, start, end, interval, points, bins, stats } = this.resource
    return {
      range,
      start: iso(start),
      end: iso(end),
      interval,
      points: points.map(point),
      bins: bins.map((bin) => ({ ...bin, start: iso(bin.start), end: iso(bin.end) })),
      stats: stats && {
        count: stats.count,
        min: stats.min,
        max: stats.max,
        average: stats.average,
        last: point(stats.last),
        largestVariation: stats.largestVariation && {
          from: point(stats.largestVariation.from),
          to: point(stats.largestVariation.to),
          delta: stats.largestVariation.delta,
        },
      },
    }
  }
}
