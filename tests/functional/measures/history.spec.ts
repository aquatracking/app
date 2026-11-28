import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Measure from '#models/measure'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeMeasures, vivariumTracking } from '#tests/helpers/measures'
import { UserFactory } from '#database/factories/user_factory'

type HistoryProps = {
  readings: {
    data: {
      measuredAt: string
      measures: { value: number; measureType: { code: string; decimals: number } }[]
    }[]
    metadata: { total: number; currentPage: number; lastPage: number }
  }
  measuredTypes: { code: string }[]
  type: string | null
}

/**
 * Readings as "<instant> <code>,<code>".
 */
function summary(props: HistoryProps) {
  return props.readings.data.map(
    (reading) =>
      `${reading.measuredAt} ${reading.measures.map((measure) => measure.measureType.code).join(',')}`
  )
}

test.group('History', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('MEA-8 readings from the most recent, 20 per page, never split between pages', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph', 'kh'])
    const start = DateTime.fromISO('2026-01-01T08:00:00Z', { zone: 'utc' })
    for (let day = 0; day < 25; day++) {
      await storeMeasures(vivarium, start.plus({ days: day }).toISO()!, {
        temperature: 25,
        ph: 7,
        kh: 6,
      })
    }

    const first = await client.get(`/vivariums/${vivarium.id}/measures`).withInertia().loginAs(user)
    const second = await client
      .get(`/vivariums/${vivarium.id}/measures?page=2`)
      .withInertia()
      .loginAs(user)

    const firstPage = first.inertiaProps as HistoryProps
    const secondPage = second.inertiaProps as HistoryProps
    assert.lengthOf(firstPage.readings.data, 20)
    assert.lengthOf(secondPage.readings.data, 5)
    assert.equal(firstPage.readings.data[0].measuredAt, '2026-01-25T08:00:00Z')
    assert.equal(firstPage.readings.data[19].measuredAt, '2026-01-06T08:00:00Z')
    assert.equal(secondPage.readings.data[0].measuredAt, '2026-01-05T08:00:00Z')
    assert.equal(secondPage.readings.data[4].measuredAt, '2026-01-01T08:00:00Z')
    assert.deepEqual(firstPage.readings.metadata.total, 25)
    assert.deepEqual(firstPage.readings.metadata.lastPage, 2)
    for (const reading of [...firstPage.readings.data, ...secondPage.readings.data]) {
      assert.deepEqual(
        reading.measures.map((measure) => measure.measureType.code),
        ['temperature', 'ph', 'kh']
      )
    }
  })

  test('MEA-8 the history runs the same number of queries for 2 and for 20 readings', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    const countQueries = async () => {
      let queries = 0
      const count = () => queries++
      db.connection().getWriteClient().on('query', count)
      await client.get(`/vivariums/${vivarium.id}/measures`).withInertia().loginAs(user)
      db.connection().getWriteClient().off('query', count)
      return queries
    }
    const start = DateTime.fromISO('2026-01-01T08:00:00Z', { zone: 'utc' })
    for (let day = 0; day < 2; day++) {
      await storeMeasures(vivarium, start.plus({ days: day }).toISO()!, { temperature: 25, ph: 7 })
    }
    /**
     * The first request also records the last activity of the user.
     */
    await countQueries()
    const withTwo = await countQueries()
    for (let day = 2; day < 20; day++) {
      await storeMeasures(vivarium, start.plus({ days: day }).toISO()!, { temperature: 25, ph: 7 })
    }

    assert.equal(await countQueries(), withTwo)
  })

  test('MEA-9 the filter returns only the measures of the type, also for a type no longer tracked', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-10T08:00:00Z', { ph: 7, no3: 10 })
    await storeMeasures(vivarium, '2026-01-11T08:00:00Z', { ph: 7.1 })
    await storeMeasures(vivarium, '2026-01-12T08:00:00Z', { no3: 15, kh: 6 })

    const all = await client.get(`/vivariums/${vivarium.id}/measures`).withInertia().loginAs(user)
    const filtered = await client
      .get(`/vivariums/${vivarium.id}/measures?type=no3`)
      .withInertia()
      .loginAs(user)

    const allProps = all.inertiaProps as HistoryProps
    assert.deepEqual(
      allProps.measuredTypes.map(({ code }) => code),
      ['ph', 'kh', 'no3']
    )
    assert.deepEqual(summary(allProps), [
      '2026-01-12T08:00:00Z kh,no3',
      '2026-01-11T08:00:00Z ph',
      '2026-01-10T08:00:00Z ph,no3',
    ])
    const filteredProps = filtered.inertiaProps as HistoryProps
    assert.equal(filteredProps.type, 'no3')
    assert.deepEqual(summary(filteredProps), [
      '2026-01-12T08:00:00Z no3',
      '2026-01-10T08:00:00Z no3',
    ])
    assert.equal(filteredProps.readings.metadata.total, 2)
  })

  test('MEA-9 an unknown type filters out every reading', async ({ client, assert }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-10T08:00:00Z', { ph: 7 })

    const response = await client
      .get(`/vivariums/${vivarium.id}/measures?type=unknown`)
      .withInertia()
      .loginAs(user)

    assert.deepEqual((response.inertiaProps as HistoryProps).readings.data, [])
  })

  test('MEA-15 the same measure shows at the local time of each time zone, its instant unchanged', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T17:00:00Z', { ph: 7 })
    const editUrl = `/vivariums/${vivarium.id}/readings/2026-01-15T17:00:00Z/edit`

    const localTimes = []
    for (const timezone of ['Europe/Paris', 'America/Montreal']) {
      user.timezone = timezone
      await user.save()
      const response = await client.get(editUrl).withInertia().loginAs(user)
      const props = response.inertiaProps as {
        editedReading: { measuredAt: string; localMeasuredAt: string }
      }
      assert.equal(props.editedReading.measuredAt, '2026-01-15T17:00:00Z')
      localTimes.push(props.editedReading.localMeasuredAt)
    }

    assert.deepEqual(localTimes, ['2026-01-15T18:00', '2026-01-15T12:00'])
    const measure = await Measure.findByOrFail('vivarium_id', vivarium.id)
    assert.equal(measure.measuredAt.toUTC().toISO(), '2026-01-15T17:00:00.000Z')
  })

  test('MEA-16 values are sent as numbers, without forced trailing zeros', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['no3', 'ph'])
    await storeMeasures(vivarium, '2026-01-15T17:00:00Z', { no3: 10, ph: 7.25 })

    const response = await client
      .get(`/vivariums/${vivarium.id}/measures`)
      .withInertia()
      .loginAs(user)

    const [reading] = (response.inertiaProps as HistoryProps).readings.data
    assert.deepEqual(
      reading.measures.map(({ value, measureType }) => [
        measureType.code,
        value,
        measureType.decimals,
      ]),
      [
        ['ph', 7.25, 2],
        ['no3', 10, 1],
      ]
    )
  })

  test('MEA-28 the history filtered by type offers no deletion of a reading, only its edit', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.merge({ locale: 'en' }).create()
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'], owner)
    await storeMeasures(vivarium, '2026-01-15T17:00:00Z', { temperature: 25, ph: 7 })
    await storeMeasures(vivarium, '2026-01-16T17:00:00Z', { temperature: 25.5, ph: 7.1 })

    /**
     * The buttons of the page as rendered by the server (SSR), without
     * the props sent along.
     */
    const buttons = async (url: string) => {
      const response = await client.get(url).loginAs(user)
      response.assertStatus(200)
      const page = response.text().split('id="app"')[1]
      return {
        edit: page.split('>Edit</a>').length - 1,
        delete: page.split('Delete the reading').length - 1,
      }
    }

    const history = `/vivariums/${vivarium.id}/measures`
    assert.deepEqual(await buttons(history), { edit: 2, delete: 2 })
    assert.deepEqual(await buttons(`${history}?type=ph`), { edit: 2, delete: 0 })
  })
})
