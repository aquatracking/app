import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { selectedOptions } from '#tests/helpers/responses'
import { storeMeasures, vivariumTracking } from '#tests/helpers/measures'
import { daysAgo } from '#tests/helpers/dates'

type ChartProps = {
  measureType: { code: string; unit: string; decimals: number }
  trackedTypes: { code: string }[]
  series: {
    range: string
    start: string
    points: { measuredAt: string; value: number }[]
    stats: { count: number } | null
  }
}

test.group('Charts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('CHT-4 the chart of a type has the raw values of the range in the URL', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    const threeDaysAgo = daysAgo(3)
    await storeMeasures(vivarium, daysAgo(20), { ph: 7 })
    await storeMeasures(vivarium, threeDaysAgo, { ph: 7.2, temperature: 25 })

    const response = await client
      .get(`/vivariums/${vivarium.id}/charts/ph?range=7d`)
      .withInertia()
      .loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('charts/show')
    const props = response.inertiaProps as ChartProps
    assert.equal(props.series.range, '7d')
    assert.deepEqual(props.series.points, [{ measuredAt: threeDaysAgo, value: 7.2 }])
    assert.deepEqual(props.measureType, { code: 'ph', unit: '', decimals: 2 })
    assert.deepEqual(
      props.trackedTypes.map(({ code }) => code),
      ['temperature', 'ph']
    )
  })

  test('CHT-7 a missing or invalid range is the default one, 30 days', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    const twentyDaysAgo = daysAgo(20)
    await storeMeasures(vivarium, twentyDaysAgo, { ph: 7 })
    await storeMeasures(vivarium, daysAgo(40), { ph: 7.5 })

    for (const qs of ['', '?range=2w', '?range=', '?range[]=7d']) {
      const response = await client
        .get(`/vivariums/${vivarium.id}/charts/ph${qs}`)
        .withInertia()
        .loginAs(user)
      const props = response.inertiaProps as ChartProps
      assert.equal(props.series.range, '30d', qs)
      assert.deepEqual(props.series.points, [{ measuredAt: twentyDaysAgo, value: 7 }], qs)
    }
  })

  test('CHT-8 an unknown type, or one neither tracked nor measured, is not found', async ({
    client,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, daysAgo(2), { no3: 10 })

    for (const code of ['unknown', 'kh']) {
      const response = await client
        .get(`/vivariums/${vivarium.id}/charts/${code}`)
        .withInertia()
        .loginAs(user)
      response.assertStatus(404)
    }
  })

  test('CHT-8 a type no longer tracked but measured, or tracked without measure, has its chart', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, daysAgo(2), { no3: 10 })

    const measured = await client
      .get(`/vivariums/${vivarium.id}/charts/no3`)
      .withInertia()
      .loginAs(user)
    const tracked = await client
      .get(`/vivariums/${vivarium.id}/charts/ph`)
      .withInertia()
      .loginAs(user)

    measured.assertStatus(200)
    const measuredProps = measured.inertiaProps as ChartProps
    assert.equal(measuredProps.measureType.code, 'no3')
    assert.equal(measuredProps.series.stats!.count, 1)
    tracked.assertStatus(200)
    assert.isNull((tracked.inertiaProps as ChartProps).series.stats)
  })

  test('the chart of an archived vivarium stays readable, without reading form', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    vivarium.archivedAt = DateTime.now()
    await vivarium.save()

    const response = await client
      .get(`/vivariums/${vivarium.id}/charts/ph`)
      .withInertia()
      .loginAs(user)

    response.assertStatus(200)
    assert.deepEqual(response.inertiaProps.readingFields, [])
  })

  test('CHT-9 the dashboard and the charts of the vivarium of another user are not found', async ({
    client,
  }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, daysAgo(2), { ph: 7 })
    const stranger = await UserFactory.create()

    for (const url of [`/vivariums/${vivarium.id}`, `/vivariums/${vivarium.id}/charts/ph`]) {
      const response = await client.get(url).withInertia().loginAs(stranger)
      response.assertStatus(404)
    }
  })

  test('CHT-17 the chart rendered by the server has the displayed type selected in the list', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph'])
    await storeMeasures(vivarium, daysAgo(2), { ph: 7, no3: 10 })

    const tracked = await client.get(`/vivariums/${vivarium.id}/charts/ph`).loginAs(user)
    const untracked = await client.get(`/vivariums/${vivarium.id}/charts/no3`).loginAs(user)

    tracked.assertStatus(200)
    assert.deepEqual(selectedOptions(tracked, 'measure-type'), ['ph'])
    untracked.assertStatus(200)
    assert.deepEqual(selectedOptions(untracked, 'measure-type'), ['no3'])
  })
})
