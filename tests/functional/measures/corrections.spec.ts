import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Measure from '#models/measure'
import app from '@adonisjs/core/services/app'
import { errors as lucidErrors } from '@adonisjs/lucid'
import testUtils from '@adonisjs/core/services/test_utils'
import { ReadingService } from '#services/reading_service'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import { MEASURE_TYPES, MeasureTypeCatalog } from '#catalog/measure_types'
import {
  deleteReading,
  failWritesOf,
  measuresOf,
  putReading,
  readingUrl,
  storeMeasures,
  vivariumTracking,
} from '#tests/helpers/measures'
import { fieldErrors } from '#tests/helpers/responses'

test.group('Reading corrections', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(MeasureTypeCatalog))

  test('MEA-7 an edited reading also accepts the types it has, tracked or not', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7, no3: 10 })

    const edit = await client
      .get(`${readingUrl(vivarium, '2026-01-15T18:00:00Z')}/edit`)
      .withInertia()
      .loginAs(user)
    assert.deepEqual(
      (edit.inertiaProps as { fields: { code: string }[] }).fields.map(({ code }) => code),
      ['ph', 'no3']
    )

    const refused = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', no3: '12', kh: '6' },
    })
    assert.deepEqual(fieldErrors(refused, 'values.kh'), [
      'This parameter is not part of this reading',
    ])

    await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', no3: '12' },
    })
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z no3=12',
      '2026-01-15T18:00:00Z ph=7',
    ])
  })

  test('MEA-10 editing updates, creates, deletes and moves the measures of the reading', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph', 'kh', 'no3'])
    const [temperature, ph] = await storeMeasures(vivarium, '2026-01-15T18:00:00Z', {
      temperature: 25,
      ph: 7,
      kh: 6,
    })
    await storeMeasures(vivarium, '2026-01-14T18:00:00Z', { ph: 6.8 })

    const response = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T19:30',
      values: { temperature: '25', ph: '7,4', kh: '', no3: '10' },
    })

    response.assertHeader('location', `/vivariums/${vivarium.id}/measures`)
    response.assertFlashMessage('notification', { type: 'success', message: 'Reading updated.' })
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-14T18:00:00Z ph=6.8',
      '2026-01-15T19:30:00Z no3=10',
      '2026-01-15T19:30:00Z ph=7.4',
      '2026-01-15T19:30:00Z temperature=25',
    ])
    /**
     * The measures are updated, not replaced.
     */
    assert.isNotNull(await Measure.find(temperature.id))
    assert.isNotNull(await Measure.find(ph.id))
  })

  test('MEA-10 a failure after the first writes cancels the whole edit', async ({ assert }) => {
    const { vivarium } = await vivariumTracking(['temperature', 'ph', 'kh', 'no3'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { temperature: 25, ph: 7, kh: 6 })
    await failWritesOf('no3')
    const service = await app.container.make(ReadingService)
    const reading = await service.find(
      vivarium,
      DateTime.fromISO('2026-01-15T18:00:00Z', { zone: 'utc' })
    )

    /**
     * pH is deleted, then temperature and kH are updated and moved,
     * before the insertion of nitrates fails.
     */
    await assert.rejects(
      () =>
        service.update(vivarium, reading!, {
          measuredAt: DateTime.fromISO('2026-01-15T19:30:00Z', { zone: 'utc' }),
          values: { temperature: 26, ph: null, kh: 6, no3: 10 },
        }),
      /measure write refused by the test/
    )
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z kh=6',
      '2026-01-15T18:00:00Z ph=7',
      '2026-01-15T18:00:00Z temperature=25',
    ])
  })

  test('MEA-25 saving a reading deleted in the meantime is refused as not found and creates nothing', async ({
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph', 'kh'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })
    const service = await app.container.make(ReadingService)
    const reading = await service.find(
      vivarium,
      DateTime.fromISO('2026-01-15T18:00:00Z', { zone: 'utc' })
    )
    await service.destroy(vivarium, reading!)

    await assert.rejects(
      () =>
        service.update(vivarium, reading!, {
          measuredAt: DateTime.fromISO('2026-01-15T18:00:00Z', { zone: 'utc' }),
          values: { ph: 7.2, kh: 6 },
        }),
      lucidErrors.E_ROW_NOT_FOUND
    )
    assert.deepEqual(await measuresOf(vivarium), [])
  })

  test('MEA-10 a value out of bounds cancels the whole edit', async ({ client, assert }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'ph', 'kh'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { temperature: 25, ph: 7, kh: 6 })

    const response = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T19:30',
      values: { temperature: '26', ph: '15', kh: '' },
    })

    assert.deepEqual(fieldErrors(response, 'values.ph'), ['Enter a number between 0 and 14'])
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z kh=6',
      '2026-01-15T18:00:00Z ph=7',
      '2026-01-15T18:00:00Z temperature=25',
    ])
  })

  test('MEA-10 an edit that empties every field is refused: the reading is deleted instead', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })

    const response = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '' },
    })

    assert.deepEqual(fieldErrors(response, 'values'), ['Enter at least one value'])
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:00:00Z ph=7'])
  })

  test('MEA-26 the history keeps its filter and page after an edit or a deletion', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })
    await storeMeasures(vivarium, '2026-01-16T18:00:00Z', { ph: 7.2 })

    const edited = await client
      .put(`${readingUrl(vivarium, '2026-01-15T18:00:00Z')}?type=ph&page=2`)
      .withInertia()
      .header('referer', `/vivariums/${vivarium.id}/measures`)
      .json({ measuredAt: '2026-01-15T18:00', values: { ph: '7.1' } })
      .withCsrfToken()
      .loginAs(user)
      .redirects(0)
    const deleted = await client
      .delete(`${readingUrl(vivarium, '2026-01-16T18:00:00Z')}?page=2&other=1`)
      .withInertia()
      .header('referer', `/vivariums/${vivarium.id}/measures`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0)
    await storeMeasures(vivarium, '2026-01-17T18:00:00Z', { ph: 7.3 })
    const invalidPage = await client
      .delete(`${readingUrl(vivarium, '2026-01-17T18:00:00Z')}?type=&page=abc`)
      .withInertia()
      .header('referer', `/vivariums/${vivarium.id}/measures`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0)

    edited.assertHeader('location', `/vivariums/${vivarium.id}/measures?type=ph&page=2`)
    // Only the filter and the page are carried back, cleaned
    deleted.assertHeader('location', `/vivariums/${vivarium.id}/measures?page=2`)
    invalidPage.assertHeader('location', `/vivariums/${vivarium.id}/measures`)
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:00:00Z ph=7.1'])
  })

  test('MEA-27 the routes of a reading accept the instant with encoded colons, as built by the client', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })
    const encoded = encodeURIComponent('2026-01-15T18:00:00Z')

    const edit = await client
      .get(`${readingUrl(vivarium, encoded)}/edit`)
      .withInertia()
      .loginAs(user)
    edit.assertStatus(200)
    assert.equal(
      (edit.inertiaProps as { editedReading: { measuredAt: string } }).editedReading.measuredAt,
      '2026-01-15T18:00:00Z'
    )

    await putReading(client, user, vivarium, encoded, {
      measuredAt: '2026-01-15T18:05',
      values: { ph: '7.1' },
    })
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:05:00Z ph=7.1'])

    await deleteReading(client, user, vivarium, encodeURIComponent('2026-01-15T18:05:00Z'))
    assert.deepEqual(await measuresOf(vivarium), [])
  })

  test('MEA-11 deleting a reading deletes all its measures, and only these', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh'])
    const other = await vivariumTracking(['ph'], user)
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7, kh: 6, no3: 10 })
    await storeMeasures(vivarium, '2026-01-15T18:01:00Z', { ph: 7.1 })
    await storeMeasures(other.vivarium, '2026-01-15T18:00:00Z', { ph: 6.5 })

    const response = await deleteReading(client, user, vivarium, '2026-01-15T18:00:00Z')

    response.assertHeader('location', `/vivariums/${vivarium.id}/measures`)
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Reading deleted (3 measures).',
    })
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:01:00Z ph=7.1'])
    assert.deepEqual(await measuresOf(other.vivarium), ['2026-01-15T18:00:00Z ph=6.5'])
  })

  test('MEA-19 moving a reading to a minute with one of its types is refused', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7, kh: 6 })
    await storeMeasures(vivarium, '2026-01-15T19:00:00Z', { ph: 7.2 })

    const response = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T19:00',
      values: { ph: '7', kh: '6' },
    })

    assert.deepEqual(fieldErrors(response, 'measuredAt'), [
      'This reading already has a value of pH at this date and time. Edit the existing reading from the history.',
    ])
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z kh=6',
      '2026-01-15T18:00:00Z ph=7',
      '2026-01-15T19:00:00Z ph=7.2',
    ])
  })

  test('MEA-19 moving a reading to a minute with other types only merges both readings', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh', 'no3'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7, kh: 6 })
    await storeMeasures(vivarium, '2026-01-15T19:00:00Z', { no3: 10 })

    await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T19:00',
      values: { ph: '7', kh: '6' },
    })

    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T19:00:00Z kh=6',
      '2026-01-15T19:00:00Z no3=10',
      '2026-01-15T19:00:00Z ph=7',
    ])
    const edit = await client
      .get(`${readingUrl(vivarium, '2026-01-15T19:00:00Z')}/edit`)
      .withInertia()
      .loginAs(user)
    const props = edit.inertiaProps as {
      editedReading: { measures: { measureType: { code: string } }[] }
    }
    assert.deepEqual(
      props.editedReading.measures.map(({ measureType }) => measureType.code),
      ['ph', 'kh', 'no3']
    )
  })

  test('MEA-23 the bounds and decimals of a retired type still validate the edit of a reading', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'fe'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7, fe: 0.1 })
    app.container.swap(
      MeasureTypeCatalog,
      () =>
        new MeasureTypeCatalog(
          MEASURE_TYPES.map((entry) => ({ ...entry, retired: entry.code === 'fe' }))
        )
    )
    /**
     * Not tracked any more: the type is only in the reading.
     */
    const service = await app.container.make(TrackedMeasureService)
    const tracked = await service.list(vivarium)
    await service.remove(tracked.find(({ measureType }) => measureType.code === 'fe')!)

    const tooHigh = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', fe: '11' },
    })
    assert.deepEqual(fieldErrors(tooHigh, 'values.fe'), ['Enter a number between 0 and 10'])
    const tooPrecise = await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', fe: '0.125' },
    })
    assert.deepEqual(fieldErrors(tooPrecise, 'values.fe'), ['Enter at most 2 decimals'])

    await putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', fe: '0.25' },
    })
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z fe=0.25',
      '2026-01-15T18:00:00Z ph=7',
    ])
  })
})
