import { DateTime, type DurationLike } from 'luxon'
import { inject } from '@adonisjs/core'
import type Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import MeasureType from '#models/measure_type'
import { TrackedMeasureService } from '#services/tracked_measure_service'

/**
 * Ranges of a chart (docs/CONTEXT.md), as in its URL ("?range=").
 */
export const CHART_RANGES = ['7d', '30d', '3m', '6m', '1y', 'all'] as const
export type ChartRange = (typeof CHART_RANGES)[number]
export const DEFAULT_CHART_RANGE: ChartRange = '30d'

/**
 * Above this number of measures in a range, the series is aggregated
 * (docs/data-model.md explains the figure).
 */
export const MAX_CHART_POINTS = 500

const RANGE_DURATIONS: Record<Exclude<ChartRange, 'all'>, DurationLike> = {
  '7d': { days: 7 },
  '30d': { days: 30 },
  '3m': { months: 3 },
  '6m': { months: 6 },
  '1y': { years: 1 },
}

/**
 * Intervals of less than a day that an aggregation may use, in minutes,
 * from the smallest. Beyond them, intervals are whole local days.
 */
const SUB_DAY_INTERVALS = [1, 5, 15, 30, 60, 180, 360, 720]

const DAY_MS = 24 * 3600 * 1000

export interface SeriesPoint {
  measuredAt: DateTime
  value: number
}

/**
 * An interval of an aggregated series, from "start" included to "end"
 * excluded, with the average (rounded to the decimals of the type), the
 * minimum and the maximum of its measures.
 */
export interface SeriesBin {
  start: DateTime
  end: DateTime
  average: number
  min: number
  max: number
  count: number
}

export interface SeriesStats {
  count: number
  min: number
  max: number
  average: number
  last: SeriesPoint
  /**
   * Largest difference between two consecutive measures of the range,
   * the most recent one on a tie; null with a single measure.
   */
  largestVariation: { from: SeriesPoint; to: SeriesPoint; delta: number } | null
}

/**
 * The series of a chart: raw "points" when the range has at most
 * MAX_CHART_POINTS measures, otherwise "bins" of "interval". Empty
 * without any measure in the range ("stats" null).
 */
export interface MeasureSeries {
  range: ChartRange
  start: DateTime
  end: DateTime
  interval: { unit: 'minute' | 'hour' | 'day'; size: number } | null
  points: SeriesPoint[]
  bins: SeriesBin[]
  stats: SeriesStats | null
}

/**
 * A tile of the dashboard (docs/CONTEXT.md): the last value of a tracked
 * measure, its variation from the previous measure and the measures of
 * the last 30 days ("sparkline", empty below 2 measures).
 */
export interface Tile {
  measureType: MeasureType
  last: SeriesPoint | null
  variation: number | null
  sparkline: SeriesPoint[]
}

interface Options {
  /**
   * IANA time zone of the user: ranges and intervals of a day or more
   * are local days.
   */
  timezone: string
  now?: DateTime
}

interface MeasureRow {
  measure_type_id: string
  value: string
  measured_at: Date
}

/**
 * Last values and series of the measures of a vivarium, callable outside
 * HTTP (docs/features/07-charts.md). The caller authorizes with
 * VivariumPolicy. Read-only: allowed on an archived vivarium.
 */
@inject()
export class MeasureSeriesService {
  constructor(protected trackedMeasureService: TrackedMeasureService) {}

  /**
   * The range of the URL, the default one when missing or invalid.
   */
  static parseRange(value: unknown): ChartRange {
    return CHART_RANGES.find((range) => range === value) ?? DEFAULT_CHART_RANGE
  }

  /**
   * One tile per tracked measure, in their order. A constant number of
   * queries whatever the number of tracked measures.
   */
  async tiles(vivarium: Vivarium, { timezone, now = DateTime.now() }: Options): Promise<Tile[]> {
    const tracked = await this.trackedMeasureService.list(vivarium)
    if (tracked.length === 0) {
      return []
    }
    const typeIds = tracked.map(({ measureTypeId }) => measureTypeId)

    /**
     * The last two measures of each tracked type, read backwards on the
     * unique index: the cost depends on the number of tracked measures,
     * not on the number of measures of the vivarium. Most recent first.
     */
    const recentRows: MeasureRow[] = await db
      .from('tracked_measures as t')
      .joinRaw(
        `cross join lateral (
          select m.value, m.measured_at from measures m
          where m.vivarium_id = t.vivarium_id and m.measure_type_id = t.measure_type_id
          order by m.measured_at desc
          limit 2
        ) as recent`
      )
      .select('t.measure_type_id', 'recent.value', 'recent.measured_at')
      .where('t.vivarium_id', vivarium.id)
      .orderBy('recent.measured_at', 'desc')

    const sparklineRows: MeasureRow[] = await db
      .from('measures')
      .select('measure_type_id', 'value', 'measured_at')
      .where('vivarium_id', vivarium.id)
      .whereIn('measure_type_id', typeIds)
      .where('measured_at', '>=', this.rangeStart('30d', timezone, now).toISO()!)
      .where('measured_at', '<=', now.toISO()!)
      .orderBy('measured_at', 'asc')

    return tracked.map(({ measureType }) => {
      const ofType = (row: MeasureRow) => row.measure_type_id === measureType.id
      const [last, previous] = recentRows.filter(ofType)
      const sparkline = sparklineRows.filter(ofType).map(toPoint)
      return {
        measureType,
        last: last ? toPoint(last) : null,
        variation:
          last && previous
            ? round(Number(last.value) - Number(previous.value), measureType.decimals)
            : null,
        sparkline: sparkline.length >= 2 ? sparkline : [],
      }
    })
  }

  /**
   * The type of a chart and the tracked types to navigate to, in their
   * order. Null when the code is unknown, or when the type is neither
   * tracked nor measured on the vivarium.
   */
  async chartTypes(vivarium: Vivarium, code: string) {
    const trackedMeasures = await this.trackedMeasureService.list(vivarium)
    const tracked = trackedMeasures.map(({ measureType }) => measureType)
    const trackedType = tracked.find((type) => type.code === code)
    if (trackedType) {
      return { measureType: trackedType, tracked }
    }
    const measureType = await MeasureType.query()
      .where('code', code)
      .whereExists((query) =>
        query
          .from('measures')
          .where('vivarium_id', vivarium.id)
          .whereColumn('measure_type_id', 'measure_types.id')
      )
      .first()
    return measureType ? { measureType, tracked } : null
  }

  /**
   * The series and statistics of a type over a range.
   */
  async series(
    vivarium: Vivarium,
    measureType: MeasureType,
    range: ChartRange,
    { timezone, now = DateTime.now() }: Options
  ): Promise<MeasureSeries> {
    const start = await this.seriesStart(vivarium, measureType, range, timezone, now)
    const empty = { range, start, end: now, interval: null, points: [], bins: [], stats: null }
    if (!start) {
      return { ...empty, start: now }
    }

    const inRange = () =>
      db
        .from('measures')
        .where('vivarium_id', vivarium.id)
        .where('measure_type_id', measureType.id)
        .where('measured_at', '>=', start.toISO()!)
        .where('measured_at', '<=', now.toISO()!)

    const stats = await this.stats(inRange, measureType.decimals)
    if (!stats) {
      return { ...empty, start }
    }

    if (stats.count <= MAX_CHART_POINTS) {
      const rows: MeasureRow[] = await inRange()
        .select('measure_type_id', 'value', 'measured_at')
        .orderBy('measured_at', 'asc')
      return { ...empty, start, points: rows.map(toPoint), stats }
    }

    const interval = this.interval(start, now)
    /**
     * Intervals of a day or more are binned on the local time, where
     * every day lasts 24 hours, then converted back to instants.
     */
    const zone = interval.unit === 'day' ? timezone : 'UTC'
    const stride = `${interval.size} ${interval.unit}s`
    const origin = start.setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm:ss")
    const binned = inRange().select(
      db.raw('date_bin(?::interval, measured_at at time zone ?, ?::timestamp) as bin', [
        stride,
        zone,
        origin,
      ]),
      'value'
    )
    const rows: {
      start: Date
      end: Date
      average: string
      min: string
      max: string
      count: number
    }[] = await db
      .from(binned.as('binned'))
      .select(
        db.raw('bin at time zone ? as start', [zone]),
        db.raw('(bin + ?::interval) at time zone ? as end', [stride, zone]),
        db.raw('round(avg(value), ?) as average', [measureType.decimals]),
        db.raw('min(value) as min'),
        db.raw('max(value) as max'),
        db.raw('count(*)::int as count')
      )
      .groupBy('bin')
      .orderBy('bin', 'asc')

    return {
      ...empty,
      start,
      interval,
      bins: rows.map((row) => ({
        start: DateTime.fromJSDate(row.start).toUTC(),
        end: DateTime.fromJSDate(row.end).toUTC(),
        average: Number(row.average),
        min: Number(row.min),
        max: Number(row.max),
        count: row.count,
      })),
      stats,
    }
  }

  /**
   * Start of a range: the local midnight that makes it last its duration
   * up to today included ("7d" is today and the 6 days before). "all"
   * starts on the local day of the first measure, null without any.
   */
  private async seriesStart(
    vivarium: Vivarium,
    measureType: MeasureType,
    range: ChartRange,
    timezone: string,
    now: DateTime
  ) {
    if (range !== 'all') {
      return this.rangeStart(range, timezone, now)
    }
    const row = await db
      .from('measures')
      .where('vivarium_id', vivarium.id)
      .where('measure_type_id', measureType.id)
      .min('measured_at as first')
      .first()
    return row?.first
      ? DateTime.fromJSDate(row.first).setZone(timezone).startOf('day').toUTC()
      : null
  }

  private rangeStart(range: Exclude<ChartRange, 'all'>, timezone: string, now: DateTime) {
    return now
      .setZone(timezone)
      .startOf('day')
      .minus(RANGE_DURATIONS[range])
      .plus({ days: 1 })
      .toUTC()
  }

  /**
   * The smallest interval that cuts the range into at most
   * MAX_CHART_POINTS intervals. In whole days from one day: a local day
   * lasts at most 25 hours, hence the extra day in the count.
   */
  private interval(start: DateTime, end: DateTime): NonNullable<MeasureSeries['interval']> {
    const span = end.toMillis() - start.toMillis()
    const minutes = SUB_DAY_INTERVALS.find(
      (size) => Math.ceil(span / (size * 60 * 1000)) <= MAX_CHART_POINTS
    )
    if (minutes) {
      return minutes % 60 === 0
        ? { unit: 'hour', size: minutes / 60 }
        : { unit: 'minute', size: minutes }
    }
    return { unit: 'day', size: Math.ceil((span / DAY_MS + 1) / MAX_CHART_POINTS) }
  }

  private async stats(
    inRange: () => ReturnType<typeof db.from>,
    decimals: number
  ): Promise<SeriesStats | null> {
    const totals = await inRange()
      .select(
        db.raw('count(*)::int as count'),
        db.raw('min(value) as min'),
        db.raw('max(value) as max'),
        db.raw('round(avg(value), ?) as average', [decimals])
      )
      .first()
    if (!totals || totals.count === 0) {
      return null
    }

    const last: MeasureRow = await inRange()
      .select('measure_type_id', 'value', 'measured_at')
      .orderBy('measured_at', 'desc')
      .first()

    const consecutive = inRange().select(
      'value',
      'measured_at',
      db.raw('lag(value) over (order by measured_at) as previous_value'),
      db.raw('lag(measured_at) over (order by measured_at) as previous_measured_at')
    )
    const variation:
      | { value: string; measured_at: Date; previous_value: string; previous_measured_at: Date }
      | undefined = await db
      .from(consecutive.as('consecutive'))
      .select('*')
      .whereNotNull('previous_measured_at')
      .orderByRaw('abs(value - previous_value) desc, measured_at desc')
      .first()

    return {
      count: totals.count,
      min: Number(totals.min),
      max: Number(totals.max),
      average: Number(totals.average),
      last: toPoint(last),
      largestVariation: variation
        ? {
            from: {
              measuredAt: DateTime.fromJSDate(variation.previous_measured_at).toUTC(),
              value: Number(variation.previous_value),
            },
            to: toPoint(variation),
            delta: round(Number(variation.value) - Number(variation.previous_value), decimals),
          }
        : null,
    }
  }
}

function toPoint(row: { value: string; measured_at: Date }): SeriesPoint {
  return { measuredAt: DateTime.fromJSDate(row.measured_at).toUTC(), value: Number(row.value) }
}

/**
 * A computed value at the decimals of its type, without forced zeros.
 */
function round(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
