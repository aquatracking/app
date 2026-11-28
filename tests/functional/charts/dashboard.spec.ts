import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { MEASURE_TYPES } from '#catalog/measure_types'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import { storeMeasures, vivariumTracking } from '#tests/helpers/measures'
import { daysAgo } from '#tests/helpers/dates'

type Tile = {
  measureType: { code: string; unit: string; decimals: number }
  last: { measuredAt: string; value: number } | null
  variation: number | null
  sparkline: { start: string; end: string; points: { measuredAt: string; value: number }[] }
}

/**
 * Tiles as "<code> <last value> <variation>".
 */
const summary = (tiles: Tile[]) =>
  tiles.map(
    (tile) => `${tile.measureType.code} ${tile.last?.value ?? '-'} ${tile.variation ?? '-'}`
  )

test.group('Dashboard tiles', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('CHT-1 one tile per tracked measure, in their order, with the last value and the variation', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['kh', 'temperature', 'ph'])
    const twoDaysAgo = daysAgo(2)
    await storeMeasures(vivarium, daysAgo(10), { temperature: 25.4, ph: 7.2, kh: 6 })
    await storeMeasures(vivarium, daysAgo(5), { temperature: 25.1, ph: 7.5 })
    await storeMeasures(vivarium, twoDaysAgo, { temperature: 25.4 })
    await storeMeasures(vivarium, daysAgo(1), { no3: 10 })

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    response.assertStatus(200)
    const tiles = response.inertiaProps.tiles as Tile[]
    assert.deepEqual(summary(tiles), ['kh 6 -', 'temperature 25.4 0.3', 'ph 7.5 0.3'])
    assert.equal(tiles[1].last!.measuredAt, twoDaysAgo)
    assert.deepEqual(tiles[1].measureType, { code: 'temperature', unit: '°C', decimals: 1 })
  })

  test('CHT-1 the sparkline has the measures of the last 30 days, from 2 of them', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    const twentyDaysAgo = daysAgo(20)
    const tenDaysAgo = daysAgo(10)
    await storeMeasures(vivarium, daysAgo(40), { temperature: 24, ph: 7 })
    await storeMeasures(vivarium, twentyDaysAgo, { temperature: 25 })
    await storeMeasures(vivarium, tenDaysAgo, { temperature: 26, ph: 7.1 })

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    const [temperature, ph] = response.inertiaProps.tiles as Tile[]
    assert.deepEqual(temperature.sparkline.points, [
      { measuredAt: twentyDaysAgo, value: 25 },
      { measuredAt: tenDaysAgo, value: 26 },
    ])
    assert.deepEqual(ph.sparkline.points, [])
    assert.equal(ph.variation, 0.1)
  })

  test('CHT-2 a tracked measure without any measure has no last value', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    await storeMeasures(vivarium, daysAgo(1), { temperature: 25 })

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    const [, ph] = response.inertiaProps.tiles as Tile[]
    const { start, end, ...sparkline } = ph.sparkline
    assert.deepEqual(
      { ...ph, sparkline },
      {
        measureType: { code: 'ph', unit: '', decimals: 2 },
        last: null,
        variation: null,
        sparkline: { points: [] },
      }
    )
    assert.isTrue(DateTime.fromISO(start).isValid)
    assert.isTrue(DateTime.fromISO(end).isValid)
  })

  test('CHT-13 each tile receives the bounds of the 30d range in local days, whatever the measures', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature'])
    user.timezone = 'Pacific/Auckland'
    await user.save()
    await storeMeasures(vivarium, daysAgo(14), { temperature: 25 })
    await storeMeasures(vivarium, daysAgo(7), { temperature: 26 })

    const before = DateTime.utc().startOf('second')
    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    const after = DateTime.utc()

    const [{ sparkline }] = response.inertiaProps.tiles as Tile[]
    const end = DateTime.fromISO(sparkline.end, { zone: 'utc' })
    assert.isTrue(end >= before && end <= after)
    const start = end.setZone('Pacific/Auckland').startOf('day').minus({ days: 29 })
    assert.equal(sparkline.start, start.toUTC().toISO({ suppressMilliseconds: true }))
    assert.equal(DateTime.fromISO(sparkline.start, { zone: 'Pacific/Auckland' }).hour, 0)
  })

  test('CHT-3 the dashboard runs the same number of queries with 2 and 15 tracked measures', async ({
    client,
    assert,
  }) => {
    const codes = MEASURE_TYPES.filter((entry) => !entry.retired).map(({ code }) => code)
    assert.isAtLeast(codes.length, 15)
    const { user, vivarium } = await vivariumTracking(codes.slice(0, 2))
    const countQueries = async () => {
      let queries = 0
      const count = () => queries++
      db.connection().getWriteClient().on('query', count)
      await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
      db.connection().getWriteClient().off('query', count)
      return queries
    }
    const measureAll = async (tracked: string[]) => {
      for (const days of [3, 2, 1]) {
        await storeMeasures(
          vivarium,
          daysAgo(days),
          Object.fromEntries(tracked.map((code, index) => [code, index + days]))
        )
      }
    }
    await measureAll(codes.slice(0, 2))
    /**
     * The first request also records the last activity of the user.
     */
    await countQueries()
    const withTwo = await countQueries()

    const service = await app.container.make(TrackedMeasureService)
    for (const code of codes.slice(2, 15)) {
      await service.add(vivarium, code)
    }
    await db.from('measures').where('vivarium_id', vivarium.id).delete()
    await measureAll(codes.slice(0, 15))

    assert.equal(await countQueries(), withTwo)
    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    assert.lengthOf(response.inertiaProps.tiles as Tile[], 15)
  })

  test('CHT-11 untracking a type keeps its measures, tracking it again brings back its tile', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    await storeMeasures(vivarium, daysAgo(3), { ph: 7 })
    await storeMeasures(vivarium, daysAgo(1), { ph: 7.2 })
    const service = await app.container.make(TrackedMeasureService)
    const trackedMeasures = await service.list(vivarium)
    const ph = trackedMeasures.find(({ measureType }) => measureType.code === 'ph')!

    await service.remove(vivarium, ph)
    const untracked = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    await service.add(vivarium, 'ph')
    const tracked = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    assert.deepEqual(summary(untracked.inertiaProps.tiles as Tile[]), ['temperature - -'])
    const count = await db.from('measures').where('vivarium_id', vivarium.id).count('* as total')
    assert.equal(Number(count[0].total), 2)
    assert.deepEqual(summary(tracked.inertiaProps.tiles as Tile[]), [
      'temperature - -',
      'ph 7.2 0.2',
    ])
  })

  test('CHT-12 a vivarium that tracks no type has no tile', async ({ client, assert }) => {
    const { user, vivarium } = await vivariumTracking([])
    await storeMeasures(vivarium, daysAgo(1), { ph: 7 })

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('vivariums/show')
    assert.deepEqual(response.inertiaProps.tiles, [])
  })
})
