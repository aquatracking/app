import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type User from '#models/user'
import Vivarium from '#models/vivarium'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'

function vivariumForm(overrides: Record<string, string> = {}) {
  return {
    kind: 'aquarium',
    name: 'Reef',
    description: '',
    waterType: 'salt',
    lengthCm: '100',
    widthCm: '50',
    heightCm: '60',
    volumeLiters: '280.5',
    startedOn: '2025-03-14',
    ...overrides,
  }
}

function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}

function createVivarium(client: ApiClient, user: User, form: Record<string, string>) {
  return client
    .post('/vivariums')
    .withInertia()
    .header('referer', '/vivariums/create')
    .form(form)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

function updateVivarium(
  client: ApiClient,
  user: User,
  vivarium: Vivarium,
  form: Record<string, string>
) {
  return client
    .put(`/vivariums/${vivarium.id}`)
    .withInertia()
    .header('referer', `/vivariums/${vivarium.id}/edit`)
    .form(form)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

function post(client: ApiClient, user: User, url: string) {
  return client
    .post(url)
    .withInertia()
    .header('referer', url)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

test.group('Vivariums', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('VIV-1 the home page lists only the vivariums in service of the user, by name', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    await VivariumFactory.merge({ userId: user.id, name: 'Nano' }).create()
    await VivariumFactory.merge({ userId: user.id, name: 'Discus' }).create()
    await VivariumFactory.merge({
      userId: user.id,
      name: 'Old',
      archivedAt: DateTime.now(),
    }).create()
    await VivariumFactory.merge({ userId: other.id, name: 'Not mine' }).create()

    const response = await client.get('/').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('vivariums/index')
    const props = response.inertiaProps as { vivariums: { name: string }[]; hasArchived: boolean }
    assert.deepEqual(
      props.vivariums.map((vivarium) => vivarium.name),
      ['Discus', 'Nano']
    )
    assert.isTrue(props.hasArchived)
  })

  test('VIV-1 a user without vivarium sees the empty home page', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.get('/').withInertia().loginAs(user)

    response.assertInertiaComponent('vivariums/index')
    response.assertInertiaPropsContains({ vivariums: [], hasArchived: false })
  })

  test('VIV-2 every route of the vivarium of another user answers 404', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.create()
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({
      userId: owner.id,
      name: 'Private',
      imagePath: 'some/image.webp',
    }).create()
    const base = `/vivariums/${vivarium.id}`

    const responses = [
      await client.get(base).withInertia().loginAs(user),
      await client.get(`${base}/edit`).withInertia().loginAs(user),
      await updateVivarium(client, user, vivarium, vivariumForm({ name: 'Taken' })),
      await post(client, user, `${base}/archive`),
      await post(client, user, `${base}/unarchive`),
      await client.get(`${base}/image/image.webp`).loginAs(user),
      await client.delete(`${base}/image`).withInertia().withCsrfToken().loginAs(user),
    ]

    for (const response of responses) {
      response.assertStatus(404)
    }
    await vivarium.refresh()
    assert.equal(vivarium.name, 'Private')
    assert.isNull(vivarium.archivedAt)
    assert.equal(vivarium.imagePath, 'some/image.webp')
  })

  test('VIV-2 the owner sees the dashboard of the vivarium', async ({ client }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id, name: 'Reef' }).create()

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('vivariums/show')
    response.assertInertiaPropsContains({
      vivarium: { id: vivarium.id, name: 'Reef', isArchived: false },
    })
  })

  test('VIV-2 an unknown or malformed vivarium id answers 404', async ({ client }) => {
    const user = await UserFactory.create()

    const unknown = await client
      .get('/vivariums/0195a1b2-0000-7000-8000-000000000000')
      .withInertia()
      .loginAs(user)
    const malformed = await client.get('/vivariums/12').withInertia().loginAs(user)

    unknown.assertStatus(404)
    malformed.assertStatus(404)
  })

  test('creating a vivarium stores it for the user and opens its dashboard', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await createVivarium(client, user, vivariumForm())

    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Reef has been created.',
    })
    assert.equal(vivarium.kind, 'aquarium')
    assert.equal(vivarium.waterType, 'salt')
    assert.isNull(vivarium.climate)
    assert.isNull(vivarium.description)
    assert.deepEqual([vivarium.lengthCm, vivarium.widthCm, vivarium.heightCm], [100, 50, 60])
    assert.strictEqual(vivarium.volumeLiters, 280.5)
    assert.equal(vivarium.startedOn.toISODate(), '2025-03-14')
    assert.isNull(vivarium.archivedAt)
  })

  test('the size of a vivarium is optional and bounded', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const empty = await createVivarium(
      client,
      user,
      vivariumForm({ lengthCm: '', widthCm: '', heightCm: '', volumeLiters: '' })
    )
    const invalid = await createVivarium(
      client,
      user,
      vivariumForm({ name: 'Too big', lengthCm: '1001', widthCm: '0', volumeLiters: '10.25' })
    )

    const vivarium = await Vivarium.findByOrFail('name', 'Reef')
    empty.assertHeader('location', `/vivariums/${vivarium.id}`)
    assert.isNull(vivarium.lengthCm)
    assert.isNull(vivarium.volumeLiters)
    assert.isNotEmpty(fieldErrors(invalid, 'lengthCm'))
    assert.isNotEmpty(fieldErrors(invalid, 'widthCm'))
    assert.isNotEmpty(fieldErrors(invalid, 'volumeLiters'))
    assert.isNull(await Vivarium.findBy('name', 'Too big'))
  })

  test('VIV-3 an aquarium without water type is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await createVivarium(client, user, vivariumForm({ waterType: '' }))

    assert.deepEqual(fieldErrors(response, 'waterType'), ['This field is required'])
    assert.isNull(await Vivarium.findBy('user_id', user.id))
  })

  test('VIV-3 an aquarium with a climate is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await createVivarium(client, user, vivariumForm({ climate: 'tropical' }))

    assert.deepEqual(fieldErrors(response, 'climate'), [
      'This field does not apply to this type of tank',
    ])
    assert.isNull(await Vivarium.findBy('user_id', user.id))
  })

  test('VIV-3 a terrarium with a water type is refused, without it it is created', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const refused = await createVivarium(
      client,
      user,
      vivariumForm({ kind: 'terrarium', waterType: 'fresh', climate: 'desert' })
    )
    assert.deepEqual(fieldErrors(refused, 'waterType'), [
      'This field does not apply to this type of tank',
    ])
    assert.isNull(await Vivarium.findBy('user_id', user.id))

    const form: Record<string, string> = vivariumForm({ kind: 'terrarium', climate: 'desert' })
    delete form.waterType
    await createVivarium(client, user, form)

    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    assert.equal(vivarium.kind, 'terrarium')
    assert.isNull(vivarium.waterType)
    assert.equal(vivarium.climate, 'desert')
  })

  test('VIV-3 a paludarium requires both a water type and a climate', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const withoutClimate = await createVivarium(client, user, vivariumForm({ kind: 'paludarium' }))
    const withoutWater = await createVivarium(
      client,
      user,
      vivariumForm({ kind: 'paludarium', waterType: '', climate: 'tropical' })
    )
    assert.deepEqual(fieldErrors(withoutClimate, 'climate'), ['This field is required'])
    assert.deepEqual(fieldErrors(withoutWater, 'waterType'), ['This field is required'])
    assert.isNull(await Vivarium.findBy('user_id', user.id))

    await createVivarium(
      client,
      user,
      vivariumForm({ kind: 'paludarium', waterType: 'fresh', climate: 'tropical' })
    )
    const vivarium = await Vivarium.findByOrFail('user_id', user.id)
    assert.equal(vivarium.waterType, 'fresh')
    assert.equal(vivarium.climate, 'tropical')
  })

  test('VIV-3 the database refuses a profile that does not match the kind', async ({ assert }) => {
    const user = await UserFactory.create()

    await assert.rejects(
      () => VivariumFactory.merge({ userId: user.id, kind: 'terrarium', climate: null }).create(),
      /vivariums_profile_check/
    )
  })

  test('VIV-4 a set-up date after today in the time zone of the user is refused', async ({
    client,
    assert,
  }) => {
    /**
     * Pacific/Kiritimati is UTC+14: its today is ahead of every other
     * time zone, and Pacific/Pago_Pago (UTC-11) is behind them.
     */
    const ahead = await UserFactory.merge({ timezone: 'Pacific/Kiritimati' }).create()
    const behind = await UserFactory.merge({ timezone: 'Pacific/Pago_Pago' }).create()
    const aheadToday = DateTime.now().setZone('Pacific/Kiritimati').toISODate()!
    const behindTomorrow = DateTime.now()
      .setZone('Pacific/Pago_Pago')
      .plus({ days: 1 })
      .toISODate()!

    const accepted = await createVivarium(client, ahead, vivariumForm({ startedOn: aheadToday }))
    const refused = await createVivarium(
      client,
      behind,
      vivariumForm({ startedOn: behindTomorrow })
    )

    const vivarium = await Vivarium.findByOrFail('user_id', ahead.id)
    accepted.assertHeader('location', `/vivariums/${vivarium.id}`)
    assert.equal(vivarium.startedOn.toISODate(), aheadToday)
    assert.deepEqual(fieldErrors(refused, 'startedOn'), ['The date cannot be in the future'])
    assert.isNull(await Vivarium.findBy('user_id', behind.id))
  })

  test('VIV-4 moving the set-up date into the future is refused', async ({ client, assert }) => {
    const user = await UserFactory.merge({ locale: 'fr' }).create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const startedOn = vivarium.startedOn.toISODate()
    const tomorrow = DateTime.now().plus({ days: 1 }).toISODate()!

    const response = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ waterType: 'fresh', startedOn: tomorrow })
    )

    assert.deepEqual(fieldErrors(response, 'startedOn'), ['La date ne peut pas être dans le futur'])
    await vivarium.refresh()
    assert.equal(vivarium.startedOn.toISODate(), startedOn)
  })

  test('VIV-4 an unchanged set-up date is accepted, even after today in a new time zone', async ({
    client,
    assert,
  }) => {
    /**
     * Set up today in Pacific/Kiritimati (UTC+14), a date still in the
     * future in Pacific/Pago_Pago (UTC-11), where the user moves.
     */
    const user = await UserFactory.merge({ timezone: 'Pacific/Kiritimati' }).create()
    const startedOn = DateTime.now().setZone('Pacific/Kiritimati').startOf('day')
    const vivarium = await VivariumFactory.merge({ userId: user.id, startedOn }).create()
    user.timezone = 'Pacific/Pago_Pago'
    await user.save()

    const renamed = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ name: 'Renamed', waterType: 'fresh', startedOn: startedOn.toISODate()! })
    )
    renamed.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.equal(vivarium.name, 'Renamed')

    const moved = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ waterType: 'fresh', startedOn: startedOn.plus({ days: 1 }).toISODate()! })
    )
    assert.deepEqual(fieldErrors(moved, 'startedOn'), ['The date cannot be in the future'])
    await vivarium.refresh()
    assert.equal(vivarium.startedOn.toISODate(), startedOn.toISODate())
  })

  test('editing a vivarium saves the form and opens its dashboard', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    const edit = await client.get(`/vivariums/${vivarium.id}/edit`).withInertia().loginAs(user)
    const response = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ name: 'Mangrove', waterType: 'brackish', description: 'Mudskippers' })
    )

    edit.assertInertiaComponent('vivariums/edit')
    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.equal(vivarium.name, 'Mangrove')
    assert.equal(vivarium.waterType, 'brackish')
    assert.equal(vivarium.description, 'Mudskippers')
  })

  test('VIV-6 the kind of a vivarium cannot be changed', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    const response = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ kind: 'paludarium', waterType: 'fresh', climate: 'tropical' })
    )

    /**
     * The kind is dropped: the vivarium stays an aquarium, which has no
     * climate.
     */
    assert.deepEqual(fieldErrors(response, 'climate'), [
      'This field does not apply to this type of tank',
    ])
    const withoutClimate = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ kind: 'terrarium', name: 'Renamed', waterType: 'salt' })
    )
    withoutClimate.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.equal(vivarium.kind, 'aquarium')
    assert.equal(vivarium.name, 'Renamed')
    assert.equal(vivarium.waterType, 'salt')
  })

  test('VIV-9 archiving moves a vivarium from the home page to the archived ones', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id, name: 'Reef' }).create()

    const response = await post(client, user, `/vivariums/${vivarium.id}/archive`)

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.isNotNull(vivarium.archivedAt)
    const home = await client.get('/').withInertia().loginAs(user)
    home.assertInertiaPropsContains({ vivariums: [], hasArchived: true })
    const archived = await client.get('/vivariums/archived').withInertia().loginAs(user)
    archived.assertInertiaComponent('vivariums/archived')
    archived.assertInertiaPropsContains({ vivariums: [{ id: vivarium.id, isArchived: true }] })
  })

  test('VIV-9 unarchiving puts a vivarium back on the home page', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({
      userId: user.id,
      archivedAt: DateTime.now(),
    }).create()

    const response = await post(client, user, `/vivariums/${vivarium.id}/unarchive`)

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.isNull(vivarium.archivedAt)
    const home = await client.get('/').withInertia().loginAs(user)
    home.assertInertiaPropsContains({ vivariums: [{ id: vivarium.id }], hasArchived: false })
    const archived = await client.get('/vivariums/archived').withInertia().loginAs(user)
    archived.assertInertiaPropsContains({ vivariums: [] })
  })

  test('VIV-9 the archived page lists only the archived vivariums of the user', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    await VivariumFactory.merge({
      userId: user.id,
      name: 'Old',
      archivedAt: DateTime.now(),
    }).create()
    await VivariumFactory.merge({ userId: user.id, name: 'Current' }).create()
    await VivariumFactory.merge({
      userId: other.id,
      name: 'Not mine',
      archivedAt: DateTime.now(),
    }).create()

    const response = await client.get('/vivariums/archived').withInertia().loginAs(user)

    const props = response.inertiaProps as { vivariums: { name: string }[] }
    assert.deepEqual(
      props.vivariums.map((vivarium) => vivarium.name),
      ['Old']
    )
  })

  test('VIV-10 no route deletes a vivarium', async ({ client, assert }) => {
    const deletions = router
      .toJSON()
      .root.filter((route) => route.methods.includes('DELETE'))
      .map((route) => route.pattern)
      .filter((pattern) => pattern.startsWith('/vivariums'))
    assert.deepEqual(deletions, [
      '/vivariums/:id/image',
      '/vivariums/:id/tracked-measures/:trackedMeasureId',
      '/vivariums/:id/readings/:measuredAt',
    ])

    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const response = await client
      .delete(`/vivariums/${vivarium.id}`)
      .withInertia()
      .withCsrfToken()
      .loginAs(user)

    response.assertStatus(404)
    assert.isNotNull(await Vivarium.find(vivarium.id))
  })

  test('VIV-11 an archived vivarium cannot be edited or archived again', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const archivedAt = DateTime.now().minus({ days: 3 }).startOf('second')
    const vivarium = await VivariumFactory.merge({
      userId: user.id,
      name: 'Old',
      archivedAt,
    }).create()
    const refusal = {
      type: 'error',
      message: 'This tank is archived: unarchive it to change it.',
    }

    const edit = await client
      .get(`/vivariums/${vivarium.id}/edit`)
      .withInertia()
      .header('referer', `/vivariums/${vivarium.id}`)
      .loginAs(user)
      .redirects(0)
    const update = await updateVivarium(
      client,
      user,
      vivarium,
      vivariumForm({ name: 'Renamed', waterType: 'fresh' })
    )
    const archive = await post(client, user, `/vivariums/${vivarium.id}/archive`)

    edit.assertHeader('location', `/vivariums/${vivarium.id}`)
    update.assertHeader('location', `/vivariums/${vivarium.id}/edit`)
    archive.assertHeader('location', `/vivariums/${vivarium.id}/archive`)
    for (const response of [edit, update, archive]) {
      response.assertFlashMessage('notification', refusal)
    }
    await vivarium.refresh()
    assert.equal(vivarium.name, 'Old')
    assert.isTrue(vivarium.archivedAt!.equals(archivedAt))
  })

  test('VIV-11 an archived vivarium stays visible on its dashboard', async ({ client }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({
      userId: user.id,
      archivedAt: DateTime.now(),
    }).create()

    const response = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaPropsContains({ vivarium: { id: vivarium.id, isArchived: true } })
  })
})
