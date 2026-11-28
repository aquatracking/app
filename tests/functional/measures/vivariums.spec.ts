import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Measure from '#models/measure'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { fieldErrors, storeMeasures, vivariumTracking } from '#tests/functional/measures/helpers'

/**
 * Rules of feature 04 that need the measures (docs/features/06-measures.md,
 * "Ajouts à la feature 04").
 */
test.group('Vivariums and their readings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('MEA-21 the set-up date cannot move after the local date of the oldest reading', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ timezone: 'America/Montreal' }).create()
    const { vivarium } = await vivariumTracking(['ph'], user)
    /**
     * 2026-01-16 at 03:00 UTC is 2026-01-15 in Montreal.
     */
    await storeMeasures(vivarium, '2026-01-16T03:00:00Z', { ph: 7 })
    await storeMeasures(vivarium, '2026-02-01T12:00:00Z', { ph: 7 })
    const update = (startedOn: string) =>
      client
        .put(`/vivariums/${vivarium.id}`)
        .withInertia()
        .header('referer', `/vivariums/${vivarium.id}/edit`)
        .form({
          name: vivarium.name,
          description: '',
          waterType: 'fresh',
          lengthCm: '',
          widthCm: '',
          heightCm: '',
          volumeLiters: '',
          startedOn,
        })
        .withCsrfToken()
        .loginAs(user)
        .redirects(0)

    const refused = await update('2026-01-16')
    assert.deepEqual(fieldErrors(refused, 'startedOn'), [
      'The set-up date cannot be after the first reading, on Jan 15, 2026',
    ])
    await vivarium.refresh()
    assert.equal(vivarium.startedOn.toISODate(), '2025-01-01')

    const accepted = await update('2026-01-15')
    accepted.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.equal(vivarium.startedOn.toISODate(), '2026-01-15')
  })

  test('MEA-21 an unchanged set-up date is accepted, even after the local date of the oldest reading', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ timezone: 'Europe/Paris' }).create()
    const { vivarium } = await vivariumTracking(['ph'], user)
    /**
     * 2026-01-15 at 23:30 UTC is 2026-01-16 in Paris, the day the
     * vivarium was set up, but 2026-01-15 in Montreal, where the user
     * moves afterwards.
     */
    await storeMeasures(vivarium, '2026-01-15T23:30:00Z', { ph: 7 })
    vivarium.startedOn = DateTime.fromISO('2026-01-16')
    await vivarium.save()
    user.timezone = 'America/Montreal'
    await user.save()
    const update = (fields: { name: string; startedOn: string }) =>
      client
        .put(`/vivariums/${vivarium.id}`)
        .withInertia()
        .header('referer', `/vivariums/${vivarium.id}/edit`)
        .form({
          description: '',
          waterType: 'fresh',
          lengthCm: '',
          widthCm: '',
          heightCm: '',
          volumeLiters: '',
          ...fields,
        })
        .withCsrfToken()
        .loginAs(user)
        .redirects(0)

    const renamed = await update({ name: 'Renamed', startedOn: '2026-01-16' })
    renamed.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.equal(vivarium.name, 'Renamed')

    const moved = await update({ name: 'Renamed', startedOn: '2026-01-17' })
    assert.deepEqual(fieldErrors(moved, 'startedOn'), [
      'The set-up date cannot be after the first reading, on Jan 15, 2026',
    ])
    await vivarium.refresh()
    assert.equal(vivarium.startedOn.toISODate(), '2026-01-16')
  })

  test('MEA-21 the cards of the home page and of the archived ones show the last reading, in one query', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const measured = await vivariumTracking(['ph'], user)
    await storeMeasures(measured.vivarium, '2026-01-10T08:00:00Z', { ph: 7 })
    await storeMeasures(measured.vivarium, '2026-01-12T08:00:00Z', { ph: 7.1 })
    const empty = await VivariumFactory.merge({ userId: user.id }).create()
    const archived = await VivariumFactory.merge({
      userId: user.id,
      archivedAt: DateTime.now(),
    }).create()
    await storeMeasures(archived, '2025-06-01T08:00:00Z', { ph: 6.5 })

    let measureQueries = 0
    const countQueries = (query: { sql: string }) => {
      if (query.sql.includes('"measures"')) measureQueries++
    }
    db.connection().getWriteClient().on('query', countQueries)
    const home = await client.get('/').withInertia().loginAs(user)
    db.connection().getWriteClient().off('query', countQueries)
    const archivedPage = await client.get('/vivariums/archived').withInertia().loginAs(user)

    type Cards = { vivariums: { id: string; lastMeasuredAt: string | null }[] }
    const cards = (props: unknown) =>
      Object.fromEntries((props as Cards).vivariums.map((card) => [card.id, card.lastMeasuredAt]))
    assert.deepEqual(cards(home.inertiaProps), {
      [measured.vivarium.id]: '2026-01-12T08:00:00.000Z',
      [empty.id]: null,
    })
    assert.deepEqual(cards(archivedPage.inertiaProps), {
      [archived.id]: '2025-06-01T08:00:00.000Z',
    })
    assert.equal(measureQueries, 1)
  })

  test('MEA-22 deleting a user deletes the measures of their vivariums', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const { user, vivarium } = await vivariumTracking(['ph'])
    const kept = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-10T08:00:00Z', { ph: 7 })
    await storeMeasures(kept.vivarium, '2026-01-10T08:00:00Z', { ph: 7 })

    const response = await client
      .delete(`/admin/users/${user.id}`)
      .withInertia()
      .header('referer', '/admin/users')
      .form({ email: user.email })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertHeader('location', '/admin/users')
    assert.lengthOf(await Measure.query().where('vivarium_id', vivarium.id), 0)
    assert.lengthOf(await Measure.query().where('vivarium_id', kept.vivarium.id), 1)
  })
})
