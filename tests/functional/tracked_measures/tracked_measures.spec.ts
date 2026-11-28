import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type User from '#models/user'
import Vivarium from '#models/vivarium'
import app from '@adonisjs/core/services/app'
import TrackedMeasure from '#models/tracked_measure'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import { MEASURE_TYPES, MeasureTypeCatalog } from '#catalog/measure_types'
import { fieldErrors } from '#tests/helpers/responses'
import { createVivarium } from '#tests/helpers/vivariums'

/**
 * Codes tracked by a vivarium, in their order.
 */
async function trackedCodes(vivarium: Vivarium) {
  const service = await app.container.make(TrackedMeasureService)
  const tracked = await service.list(vivarium)
  return tracked.map((trackedMeasure) => trackedMeasure.measureType.code)
}

async function track(vivarium: Vivarium, codes: string[]) {
  const service = await app.container.make(TrackedMeasureService)
  const tracked = []
  for (const code of codes) {
    tracked.push(await service.add(vivarium, code))
  }
  return tracked
}

/**
 * The form that creates a vivarium, for the given type and profile.
 */
function vivariumForm(profile: Record<string, string>) {
  return {
    name: 'New',
    description: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    volumeLiters: '',
    startedOn: '2025-03-14',
    ...profile,
  }
}

function page(vivarium: Vivarium) {
  return `/vivariums/${vivarium.id}/tracked-measures`
}

function add(client: ApiClient, user: User, vivarium: Vivarium, code: string) {
  return client
    .post(page(vivarium))
    .withInertia()
    .header('referer', page(vivarium))
    .form({ code })
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

function reorder(client: ApiClient, user: User, vivarium: Vivarium, ids: string[]) {
  return client
    .put(`${page(vivarium)}/order`)
    .withInertia()
    .header('referer', page(vivarium))
    .json({ ids })
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

function remove(client: ApiClient, user: User, vivarium: Vivarium, trackedMeasureId: string) {
  return client
    .delete(`${page(vivarium)}/${trackedMeasureId}`)
    .withInertia()
    .header('referer', page(vivarium))
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

type PageProps = {
  trackedMeasures: { id: string; measureType: { code: string; unit: string } }[]
  addableTypes: { code: string; unit: string }[]
}

test.group('Tracked measures', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(MeasureTypeCatalog))

  test('TRK-4 a saltwater aquarium tracks its defaults in catalog order', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await createVivarium(
      client,
      user,
      vivariumForm({ kind: 'aquarium', waterType: 'salt' })
    )

    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    assert.deepEqual(await trackedCodes(vivarium), [
      'temperature',
      'ph',
      'kh',
      'no3',
      'po4',
      'salinity',
      'ca',
      'mg',
    ])
    const rows = await TrackedMeasure.query().where('vivarium_id', vivarium.id)
    assert.sameMembers(
      rows.map((trackedMeasure) => trackedMeasure.position),
      [0, 1, 2, 3, 4, 5, 6, 7]
    )
  })

  test('TRK-5 a desert terrarium tracks temperature and humidity', async ({ client, assert }) => {
    const user = await UserFactory.create()

    await createVivarium(client, user, vivariumForm({ kind: 'terrarium', climate: 'desert' }))

    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'humidity'])
  })

  test('TRK-5 a freshwater tropical paludarium tracks the water defaults and humidity', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    await createVivarium(
      client,
      user,
      vivariumForm({
        kind: 'paludarium',
        waterType: 'fresh',
        climate: 'tropical',
      })
    )

    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    assert.deepEqual(await trackedCodes(vivarium), [
      'temperature',
      'ph',
      'gh',
      'kh',
      'no2',
      'no3',
      'humidity',
    ])
  })

  test('TRK-6 the page lists the tracked measures in order and offers the other types', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await track(vivarium, ['no3', 'temperature'])

    const response = await client.get(page(vivarium)).withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('tracked_measures/index')
    const props = response.inertiaProps as PageProps
    assert.deepEqual(
      props.trackedMeasures.map((trackedMeasure) => trackedMeasure.measureType),
      [
        { code: 'no3', unit: 'mg/L' },
        { code: 'temperature', unit: '°C' },
      ]
    )
    assert.deepEqual(
      props.addableTypes.map((type) => type.code),
      MEASURE_TYPES.map((entry) => entry.code).filter(
        (code) => code !== 'no3' && code !== 'temperature'
      )
    )
  })

  test('TRK-6 adding a type tracks it in last position', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await track(vivarium, ['temperature', 'ph'])

    const response = await add(client, user, vivarium, 'fe')

    response.assertHeader('location', page(vivarium))
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Iron (Fe) is now tracked.',
    })
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'ph', 'fe'])
  })

  test('TRK-6 adding a type already tracked is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await track(vivarium, ['temperature', 'ph'])

    const response = await add(client, user, vivarium, 'ph')

    response.assertHeader('location', page(vivarium))
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'This parameter is already tracked on this tank.',
    })
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'ph'])
  })

  test('TRK-6 adding a code absent from the catalog is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    const unknown = await add(client, user, vivarium, 'silicate')
    const empty = await add(client, user, vivarium, '')

    unknown.assertHeader('location', page(vivarium))
    assert.isNotEmpty(fieldErrors(unknown, 'code'))
    assert.isNotEmpty(fieldErrors(empty, 'code'))
    assert.deepEqual(await trackedCodes(vivarium), [])
  })

  test('TRK-3 a retired type is no longer offered nor added, and stays where it is tracked', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const tracking = await VivariumFactory.merge({ userId: user.id }).create()
    const other = await VivariumFactory.merge({ userId: user.id }).create()
    await track(tracking, ['temperature', 'fe'])
    app.container.swap(
      MeasureTypeCatalog,
      () =>
        new MeasureTypeCatalog(
          MEASURE_TYPES.map((entry) => ({ ...entry, retired: entry.code === 'fe' }))
        )
    )

    const trackingPage = await client.get(page(tracking)).withInertia().loginAs(user)
    const otherPage = await client.get(page(other)).withInertia().loginAs(user)
    const added = await add(client, user, other, 'fe')

    const trackingProps = trackingPage.inertiaProps as PageProps
    assert.deepEqual(
      trackingProps.trackedMeasures.map((trackedMeasure) => trackedMeasure.measureType.code),
      ['temperature', 'fe']
    )
    const offered = (otherPage.inertiaProps as PageProps).addableTypes.map((type) => type.code)
    assert.notInclude(offered, 'fe')
    assert.include(offered, 'temperature')
    assert.isNotEmpty(fieldErrors(added, 'code'))
    assert.deepEqual(await trackedCodes(other), [])
  })

  test('TRK-7 removing a tracked type then adding it again tracks it in last position', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const [temperature] = await track(vivarium, ['temperature', 'ph', 'kh'])

    const removed = await remove(client, user, vivarium, temperature.id)

    removed.assertHeader('location', page(vivarium))
    removed.assertFlashMessage('notification', {
      type: 'success',
      message: 'Temperature is no longer tracked. Its measures are kept.',
    })
    assert.deepEqual(await trackedCodes(vivarium), ['ph', 'kh'])

    await add(client, user, vivarium, 'temperature')

    assert.deepEqual(await trackedCodes(vivarium), ['ph', 'kh', 'temperature'])
  })

  test('TRK-8 reordering saves the new positions', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const [temperature, ph, kh] = await track(vivarium, ['temperature', 'ph', 'kh'])

    const response = await reorder(client, user, vivarium, [kh.id, temperature.id, ph.id])

    response.assertHeader('location', page(vivarium))
    assert.deepEqual(await trackedCodes(vivarium), ['kh', 'temperature', 'ph'])
    const positions = await TrackedMeasure.query()
      .where('vivarium_id', vivarium.id)
      .orderBy('position', 'asc')
    assert.deepEqual(
      positions.map((trackedMeasure) => trackedMeasure.position),
      [0, 1, 2]
    )
  })

  test('TRK-8 an order that is not exactly the tracked measures is refused', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const other = await VivariumFactory.merge({ userId: user.id }).create()
    const [temperature, ph, kh] = await track(vivarium, ['temperature', 'ph', 'kh'])
    const [elsewhere] = await track(other, ['gh'])

    const orders = [
      [kh.id, temperature.id],
      [kh.id, temperature.id, ph.id, elsewhere.id],
      [kh.id, temperature.id, temperature.id],
      [kh.id, temperature.id, elsewhere.id],
      [],
    ]
    for (const ids of orders) {
      const response = await reorder(client, user, vivarium, ids)
      response.assertHeader('location', page(vivarium))
      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'The list changed in the meantime: reload the page and try again.',
      })
    }

    const malformed = await reorder(client, user, vivarium, ['not-a-uuid'])
    assert.isNotEmpty(fieldErrors(malformed, 'ids.0'))
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'ph', 'kh'])
    assert.deepEqual(await trackedCodes(other), ['gh'])
  })

  test('TRK-9 the tracked measures of an archived vivarium cannot change', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({
      userId: user.id,
      archivedAt: DateTime.now(),
    }).create()
    const [temperature, ph] = await track(vivarium, ['temperature', 'ph'])
    const refusal = { type: 'error', message: 'This tank is archived: unarchive it to change it.' }

    const responses = [
      await add(client, user, vivarium, 'kh'),
      await reorder(client, user, vivarium, [ph.id, temperature.id]),
      await remove(client, user, vivarium, temperature.id),
    ]

    for (const response of responses) {
      response.assertHeader('location', page(vivarium))
      response.assertFlashMessage('notification', refusal)
    }
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'ph'])
  })

  test('TRK-9 the page of an archived vivarium shows its tracked measures without offering any', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({
      userId: user.id,
      archivedAt: DateTime.now(),
    }).create()
    await track(vivarium, ['temperature'])

    const response = await client.get(page(vivarium)).withInertia().loginAs(user)

    response.assertStatus(200)
    const props = response.inertiaProps as PageProps
    assert.lengthOf(props.trackedMeasures, 1)
    assert.deepEqual(props.addableTypes, [])
  })

  test('TRK-10 every route answers 404 for the vivarium of another user', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.create()
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: owner.id }).create()
    const [temperature, ph] = await track(vivarium, ['temperature', 'ph'])

    const responses = [
      await client.get(page(vivarium)).withInertia().loginAs(user),
      await add(client, user, vivarium, 'kh'),
      await reorder(client, user, vivarium, [ph.id, temperature.id]),
      await remove(client, user, vivarium, temperature.id),
    ]

    for (const response of responses) {
      response.assertStatus(404)
    }
    assert.deepEqual(await trackedCodes(vivarium), ['temperature', 'ph'])
  })

  test('TRK-10 removing a tracked measure of another vivarium answers 404', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const owner = await UserFactory.create()
    const mine = await VivariumFactory.merge({ userId: user.id }).create()
    const theirs = await VivariumFactory.merge({ userId: owner.id }).create()
    const [temperature] = await track(theirs, ['temperature'])

    const response = await remove(client, user, mine, temperature.id)

    response.assertStatus(404)
    assert.deepEqual(await trackedCodes(theirs), ['temperature'])
  })

  test('TRK-12 deleting a user from the administration deletes the tracked measures of their vivariums', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const kept = await VivariumFactory.merge({ userId: other.id }).create()
    await track(vivarium, ['temperature', 'ph'])
    await track(kept, ['temperature'])

    await client
      .delete(`/admin/users/${user.id}`)
      .withInertia()
      .header('referer', '/admin/users')
      .form({ email: user.email })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    assert.lengthOf(await TrackedMeasure.query().where('vivarium_id', vivarium.id), 0)
    assert.lengthOf(await TrackedMeasure.query().where('vivarium_id', kept.id), 1)
  })
})
