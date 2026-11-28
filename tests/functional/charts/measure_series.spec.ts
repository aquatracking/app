import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Measure from '#models/measure'
import type Vivarium from '#models/vivarium'
import app from '@adonisjs/core/services/app'
import MeasureType from '#models/measure_type'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeMeasures, vivariumTracking } from '#tests/helpers/measures'
import {
  MAX_CHART_POINTS,
  MeasureSeriesService,
  type MeasureSeries,
} from '#services/measure_series_service'

/**
 * Tests of MeasureSeriesService (docs/features/07-charts.md), called
 * directly: its SQL needs the database.
 */

const utc = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' })

/**
 * Measures of one type stored in one query, at UTC instants.
 */
async function storeSeries(
  vivarium: Vivarium,
  code: string,
  measures: { measuredAt: DateTime; value: number }[]
) {
  const type = await MeasureType.findByOrFail('code', code)
  await Measure.createMany(
    measures.map(({ measuredAt, value }) => ({
      vivariumId: vivarium.id,
      measureTypeId: type.id,
      value,
      measuredAt,
      source: 'manual' as const,
    }))
  )
}

async function series(
  vivarium: Vivarium,
  code: string,
  range: MeasureSeries['range'],
  options: { timezone: string; now: DateTime }
) {
  const service = await app.container.make(MeasureSeriesService)
  return service.series(vivarium, await MeasureType.findByOrFail('code', code), range, options)
}

const points = (result: MeasureSeries) =>
  result.points.map(({ measuredAt, value }) => `${measuredAt.toISO()} ${value}`)

test.group('Measure series', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('CHT-4 raw values of the range, and only them, when they are at most 500', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph', 'kh'])
    const { vivarium: other } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-03-03T23:59:00Z', { ph: 6.5 })
    await storeMeasures(vivarium, '2026-03-04T00:00:00Z', { ph: 6.6, kh: 5 })
    await storeMeasures(vivarium, '2026-03-10T08:00:00Z', { ph: 6.7 })
    await storeMeasures(vivarium, '2026-03-10T13:00:00Z', { ph: 6.8 })
    await storeMeasures(other, '2026-03-08T08:00:00Z', { ph: 8 })

    const result = await series(vivarium, 'ph', '7d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.equal(result.start.toISO(), '2026-03-04T00:00:00.000Z')
    assert.isNull(result.interval)
    assert.deepEqual(result.bins, [])
    assert.deepEqual(points(result), [
      '2026-03-04T00:00:00.000Z 6.6',
      '2026-03-10T08:00:00.000Z 6.7',
    ])
  })

  test('CHT-14 a range starts at the local midnight, "all" on the day of the first measure', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2025-06-15T21:30:00Z', { ph: 7 })
    const now = utc('2026-03-10T12:00:00Z')
    const options = { timezone: 'Europe/Paris', now }

    const starts: Record<string, string> = {}
    for (const range of ['7d', '30d', '3m', '6m', '1y', 'all'] as const) {
      const result = await series(vivarium, 'ph', range, options)
      starts[range] = result.start.toISO()!
    }

    assert.deepEqual(starts, {
      '7d': '2026-03-03T23:00:00.000Z',
      '30d': '2026-02-08T23:00:00.000Z',
      '3m': '2025-12-10T23:00:00.000Z',
      '6m': '2025-09-10T22:00:00.000Z',
      '1y': '2025-03-10T23:00:00.000Z',
      'all': '2025-06-14T22:00:00.000Z',
    })
  })

  test('CHT-5 above 500 measures, at most 500 intervals with their average, min and max', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    const start = utc('2026-03-04T00:00:00Z')
    /**
     * Values in tenths, to compute the expected averages without
     * floating point errors.
     */
    const tenths = (index: number) => 200 + ((index * 7) % 11)
    const measures = Array.from({ length: 600 }, (_, index) => ({
      measuredAt: start.plus({ minutes: 15 * index }),
      value: tenths(index) / 10,
    }))
    await storeSeries(vivarium, 'temperature', measures)

    const result = await series(vivarium, 'temperature', '7d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.deepEqual(result.points, [])
    assert.deepEqual(result.interval, { unit: 'minute', size: 30 })
    assert.isAtMost(result.bins.length, MAX_CHART_POINTS)
    assert.equal(result.stats!.count, 600)

    const expected = new Map<string, number[]>()
    measures.forEach(({ measuredAt }, index) => {
      const minutes = measuredAt.diff(start, 'minutes').minutes
      const key = start.plus({ minutes: minutes - (minutes % 30) }).toISO()!
      expected.set(key, [...(expected.get(key) ?? []), tenths(index)])
    })
    assert.equal(result.bins.length, expected.size)
    for (const bin of result.bins) {
      const values = expected.get(bin.start.toISO()!)!
      const average = values.reduce((sum, value) => sum + value, 0) / values.length
      assert.equal(bin.end.diff(bin.start, 'minutes').minutes, 30)
      assert.equal(bin.count, values.length)
      assert.equal(bin.min, Math.min(...values) / 10)
      assert.equal(bin.max, Math.max(...values) / 10)
      assert.equal(bin.average, Math.round(average) / 10)
    }
  })

  test('CHT-5 the statistics of an aggregated series are computed on the raw measures', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    /**
     * 300 intervals of 30 minutes with two measures, 6 then 8 (average
     * 7), then an interval with a single 14. On the averages of the
     * intervals, the minimum would be 7, the average 7.02 and the largest
     * variation +7.
     */
    const start = utc('2026-03-04T00:00:00Z')
    await storeSeries(vivarium, 'ph', [
      ...Array.from({ length: 600 }, (_, index) => ({
        measuredAt: start.plus({ minutes: 15 * index }),
        value: index % 2 === 0 ? 6 : 8,
      })),
      { measuredAt: utc('2026-03-10T11:00:00Z'), value: 14 },
    ])

    const result = await series(vivarium, 'ph', '7d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.lengthOf(result.bins, 301)
    assert.deepEqual(
      result.stats && { ...result.stats, last: undefined, largestVariation: undefined },
      {
        count: 601,
        min: 6,
        max: 14,
        // 4214 / 601
        average: 7.01,
        last: undefined,
        largestVariation: undefined,
      }
    )
    const variation = result.stats!.largestVariation!
    assert.equal(variation.delta, 6)
    assert.equal(variation.from.measuredAt.toISO(), '2026-03-10T05:45:00.000Z')
    assert.equal(variation.to.measuredAt.toISO(), '2026-03-10T11:00:00.000Z')
  })

  test('CHT-6 statistics of a known data set', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-03-05T08:00:00Z', { ph: 7 })
    await storeMeasures(vivarium, '2026-03-06T08:00:00Z', { ph: 7.4 })
    await storeMeasures(vivarium, '2026-03-07T08:00:00Z', { ph: 6.8 })
    await storeMeasures(vivarium, '2026-03-08T08:00:00Z', { ph: 7.1 })

    const { stats } = await series(vivarium, 'ph', '30d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.deepEqual(stats && { ...stats, last: undefined, largestVariation: undefined }, {
      count: 4,
      min: 6.8,
      max: 7.4,
      average: 7.08,
      last: undefined,
      largestVariation: undefined,
    })
    assert.equal(stats!.last.value, 7.1)
    assert.equal(stats!.last.measuredAt.toISO(), '2026-03-08T08:00:00.000Z')
    const variation = stats!.largestVariation!
    assert.equal(variation.delta, -0.6)
    assert.equal(variation.from.measuredAt.toISO(), '2026-03-06T08:00:00.000Z')
    assert.equal(variation.from.value, 7.4)
    assert.equal(variation.to.measuredAt.toISO(), '2026-03-07T08:00:00.000Z')
    assert.equal(variation.to.value, 6.8)
  })

  test('CHT-6 computed values are rounded to the decimals of the type', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    await storeMeasures(vivarium, '2026-03-05T08:00:00Z', { temperature: 25 })
    await storeMeasures(vivarium, '2026-03-06T08:00:00Z', { temperature: 25.1 })
    await storeMeasures(vivarium, '2026-03-07T08:00:00Z', { temperature: 25.1 })

    const { stats } = await series(vivarium, 'temperature', '30d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.equal(stats!.average, 25.1)
    assert.equal(stats!.largestVariation!.delta, 0.1)
  })

  test('CHT-6 a range without measure has no statistics', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-05T08:00:00Z', { ph: 7 })

    const result = await series(vivarium, 'ph', '7d', {
      timezone: 'UTC',
      now: utc('2026-03-10T12:00:00Z'),
    })

    assert.isNull(result.stats)
    assert.deepEqual(result.points, [])
    assert.deepEqual(result.bins, [])
  })

  test('CHT-10 measures of a 25-hour local day fall in one daily interval', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    /**
     * Two measures a day before, to go above 500 over the year.
     */
    const filler = []
    for (
      let day = utc('2026-11-06T06:00:00Z');
      day < utc('2027-10-29T00:00:00Z');
      day = day.plus({ days: 1 })
    ) {
      filler.push({ measuredAt: day, value: 2 }, { measuredAt: day.plus({ hours: 10 }), value: 2 })
    }
    await storeSeries(vivarium, 'temperature', [
      ...filler,
      // 30 October 23:59 in Paris (CEST)
      { measuredAt: utc('2027-10-30T21:59:00Z'), value: 1 },
      // 31 October 00:00, 02:30 CEST, 02:30 CET and 23:59 CET
      { measuredAt: utc('2027-10-30T22:00:00Z'), value: 10 },
      { measuredAt: utc('2027-10-31T00:30:00Z'), value: 20 },
      { measuredAt: utc('2027-10-31T01:30:00Z'), value: 30 },
      { measuredAt: utc('2027-10-31T22:59:00Z'), value: 40 },
      // 1 November 00:00
      { measuredAt: utc('2027-10-31T23:00:00Z'), value: 50 },
    ])

    const result = await series(vivarium, 'temperature', '1y', {
      timezone: 'Europe/Paris',
      now: utc('2027-11-05T12:00:00Z'),
    })

    assert.deepEqual(result.interval, { unit: 'day', size: 1 })
    const bins = Object.fromEntries(result.bins.map((bin) => [bin.start.toISO(), bin]))
    const day = bins['2027-10-30T22:00:00.000Z']
    assert.equal(day.end.toISO(), '2027-10-31T23:00:00.000Z')
    assert.deepEqual(
      { count: day.count, min: day.min, max: day.max, average: day.average },
      { count: 4, min: 10, max: 40, average: 25 }
    )
    assert.deepEqual(
      [bins['2027-10-29T22:00:00.000Z'].count, bins['2027-10-29T22:00:00.000Z'].average],
      [1, 1]
    )
    assert.deepEqual(
      [bins['2027-10-31T23:00:00.000Z'].count, bins['2027-10-31T23:00:00.000Z'].average],
      [1, 50]
    )
  })

  test('CHT-10 measures of a 23-hour local day fall in one daily interval', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    /**
     * Two measures a day before, to go above 500 over the year.
     */
    const filler = []
    for (
      let day = utc('2026-04-03T06:00:00Z');
      day < utc('2027-03-26T00:00:00Z');
      day = day.plus({ days: 1 })
    ) {
      filler.push({ measuredAt: day, value: 2 }, { measuredAt: day.plus({ hours: 10 }), value: 2 })
    }
    await storeSeries(vivarium, 'temperature', [
      ...filler,
      // 27 March 23:59 in Paris (CET)
      { measuredAt: utc('2027-03-27T22:59:00Z'), value: 1 },
      // 28 March 00:00 and 01:30 CET, 03:30 and 23:59 CEST
      { measuredAt: utc('2027-03-27T23:00:00Z'), value: 10 },
      { measuredAt: utc('2027-03-28T00:30:00Z'), value: 20 },
      { measuredAt: utc('2027-03-28T01:30:00Z'), value: 30 },
      { measuredAt: utc('2027-03-28T21:59:00Z'), value: 40 },
      // 29 March 00:00
      { measuredAt: utc('2027-03-28T22:00:00Z'), value: 50 },
    ])

    const result = await series(vivarium, 'temperature', '1y', {
      timezone: 'Europe/Paris',
      now: utc('2027-04-02T12:00:00Z'),
    })

    assert.deepEqual(result.interval, { unit: 'day', size: 1 })
    const bins = Object.fromEntries(result.bins.map((bin) => [bin.start.toISO(), bin]))
    const day = bins['2027-03-27T23:00:00.000Z']
    assert.equal(day.end.toISO(), '2027-03-28T22:00:00.000Z')
    assert.deepEqual(
      { count: day.count, min: day.min, max: day.max, average: day.average },
      { count: 4, min: 10, max: 40, average: 25 }
    )
    assert.deepEqual(
      [bins['2027-03-26T23:00:00.000Z'].count, bins['2027-03-26T23:00:00.000Z'].average],
      [1, 1]
    )
    assert.deepEqual(
      [bins['2027-03-28T22:00:00.000Z'].count, bins['2027-03-28T22:00:00.000Z'].average],
      [1, 50]
    )
  })

  test('CHT-10 intervals of less than a day last the same real time across a change of time', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    /**
     * Every 15 minutes from the start of the range, across the night of
     * 31 October 2027 in Paris, when 02:00 to 03:00 happens twice.
     */
    const start = utc('2027-10-26T22:00:00Z')
    await storeSeries(
      vivarium,
      'temperature',
      Array.from({ length: 600 }, (_, index) => ({
        measuredAt: start.plus({ minutes: 15 * index }),
        value: 25,
      }))
    )

    const result = await series(vivarium, 'temperature', '7d', {
      timezone: 'Europe/Paris',
      now: utc('2027-11-02T12:00:00Z'),
    })

    assert.equal(result.start.toISO(), start.toISO())
    assert.deepEqual(result.interval, { unit: 'minute', size: 30 })
    assert.lengthOf(result.bins, 300)
    result.bins.forEach((bin, index) => {
      assert.equal(bin.start.toISO(), start.plus({ minutes: 30 * index }).toISO())
      assert.equal(bin.end.diff(bin.start, 'minutes').minutes, 30)
      assert.equal(bin.count, 2)
    })
    /**
     * 02:00 CEST and 02:00 CET, an hour apart, are two intervals.
     */
    const bins = Object.fromEntries(result.bins.map((bin) => [bin.start.toISO(), bin]))
    assert.equal(bins['2027-10-31T00:00:00.000Z'].count, 2)
    assert.equal(bins['2027-10-31T01:00:00.000Z'].count, 2)
  })

  test('CHT-15 a range is cut into at most 500 intervals from its start, the smallest below a day, with an extra day beyond', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['temperature'])
    /**
     * 600 measures in the last 7 days, so that every range is aggregated,
     * and a first measure that makes "all" last 999.5 days: 2 days would
     * cut it into 500 intervals, but the extra day for the 25-hour days
     * gives 3.
     */
    const recent = utc('2026-03-04T00:00:00Z')
    await storeSeries(vivarium, 'temperature', [
      { measuredAt: utc('2023-06-15T08:00:00Z'), value: 25 },
      ...Array.from({ length: 600 }, (_, index) => ({
        measuredAt: recent.plus({ minutes: 15 * index }),
        value: 25,
      })),
    ])
    const options = { timezone: 'UTC', now: utc('2026-03-10T12:00:00Z') }

    const intervals: Record<string, string> = {}
    for (const range of ['7d', '30d', '3m', '6m', '1y', 'all'] as const) {
      const result = await series(vivarium, 'temperature', range, options)
      const { unit, size } = result.interval!
      if (range === 'all') {
        assert.equal(options.now.diff(result.start, 'days').days, 999.5)
      }
      intervals[range] = `${size} ${unit}`
      const duration = size * { minute: 60, hour: 3600, day: 86400 }[unit] * 1000
      assert.isAtMost(Math.ceil(options.now.diff(result.start).toMillis() / duration), 500)
      for (const bin of result.bins) {
        assert.equal(bin.end.diff(bin.start).toMillis(), duration)
        assert.equal(bin.start.diff(result.start).toMillis() % duration, 0)
      }
    }

    assert.deepEqual(intervals, {
      '7d': '30 minute',
      '30d': '3 hour',
      '3m': '6 hour',
      '6m': '12 hour',
      '1y': '1 day',
      'all': '3 day',
    })
  })

  test('CHT-16 the largest variation is the most recent one on a tie, none with a single measure', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    const { vivarium: single } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-03-05T08:00:00Z', { ph: 7 })
    await storeMeasures(vivarium, '2026-03-06T08:00:00Z', { ph: 7.5 })
    await storeMeasures(vivarium, '2026-03-07T08:00:00Z', { ph: 7 })
    await storeMeasures(vivarium, '2026-03-08T08:00:00Z', { ph: 7.2 })
    await storeMeasures(single, '2026-03-05T08:00:00Z', { ph: 7 })
    const options = { timezone: 'UTC', now: utc('2026-03-10T12:00:00Z') }

    const { stats } = await series(vivarium, 'ph', '30d', options)
    const { stats: singleStats } = await series(single, 'ph', '30d', options)

    const variation = stats!.largestVariation!
    assert.equal(variation.delta, -0.5)
    assert.equal(variation.from.measuredAt.toISO(), '2026-03-06T08:00:00.000Z')
    assert.equal(variation.to.measuredAt.toISO(), '2026-03-07T08:00:00.000Z')
    assert.equal(singleStats!.count, 1)
    assert.isNull(singleStats!.largestVariation)
  })
})
