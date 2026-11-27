import { test } from '@japa/runner'
import { DateTime, Settings } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import {
  fieldErrors,
  measuresOf,
  postReading,
  storeMeasures,
  vivariumTracking,
} from '#tests/functional/measures/helpers'

const FIVE_TYPES = ['temperature', 'ph', 'gh', 'kh', 'no3']

test.group('Readings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => {
    Settings.now = () => Date.now()
  })

  test('MEA-1 three values filled out of five fields create three measures at the same instant', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(FIVE_TYPES)

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { temperature: '25.5', ph: '7,2', gh: null, kh: '', no3: '10' },
    })

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Reading saved (3 measures).',
    })
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z no3=10',
      '2026-01-15T18:00:00Z ph=7.2',
      '2026-01-15T18:00:00Z temperature=25.5',
    ])
  })

  test('MEA-2 a reading without any value is refused', async ({ client, assert }) => {
    const { user, vivarium } = await vivariumTracking(FIVE_TYPES)

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { temperature: '', ph: null, gh: '  ' },
    })

    assert.deepEqual(fieldErrors(response, 'values'), ['Enter at least one value'])
    assert.deepEqual(await measuresOf(vivarium), [])
  })

  test('MEA-3 a value out of the bounds of plausibility is refused on its field, without any measure', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(FIVE_TYPES)

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { temperature: '25', ph: '15', no3: 'abc' },
    })

    assert.deepEqual(fieldErrors(response, 'values.ph'), ['Enter a number between 0 and 14'])
    assert.deepEqual(fieldErrors(response, 'values.no3'), ['Enter a number'])
    assert.deepEqual(fieldErrors(response, 'values.temperature'), [])
    assert.deepEqual(await measuresOf(vivarium), [])
  })

  test('MEA-4 "7,5" and "7.5" are both stored as 7.5', async ({ client, assert }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh'])

    await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7,5', kh: '7.5' },
    })

    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z kh=7.5',
      '2026-01-15T18:00:00Z ph=7.5',
    ])
  })

  test('MEA-5 a date more than 5 minutes in the future or before the set-up is refused', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    const local = (instant: DateTime) => instant.toUTC().toFormat("yyyy-MM-dd'T'HH:mm")

    const future = await postReading(client, user, vivarium, {
      measuredAt: local(DateTime.now().plus({ minutes: 7 })),
      values: { ph: '7' },
    })
    assert.deepEqual(fieldErrors(future, 'measuredAt'), ['The date cannot be in the future'])

    const beforeSetUp = await postReading(client, user, vivarium, {
      measuredAt: '2024-12-31T23:59',
      values: { ph: '7' },
    })
    assert.deepEqual(fieldErrors(beforeSetUp, 'measuredAt'), [
      'The date cannot be before the set-up date of the tank',
    ])
    assert.deepEqual(await measuresOf(vivarium), [])

    /**
     * Within the tolerance, and on the set-up date itself: accepted.
     */
    await postReading(client, user, vivarium, {
      measuredAt: local(DateTime.now().plus({ minutes: 3 })),
      values: { ph: '7' },
    })
    await postReading(client, user, vivarium, {
      measuredAt: '2025-01-01T00:00',
      values: { ph: '7' },
    })
    assert.lengthOf(await measuresOf(vivarium), 2)
  })

  test('MEA-5 the set-up date is compared with the local date of the reading', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ timezone: 'America/Montreal' }).create()
    const { vivarium } = await vivariumTracking(['ph'], user)

    /**
     * 2025-01-01 at 00:30 UTC is still 2024-12-31 in Montreal: refused,
     * while 2025-01-01 at 00:30 in Montreal is accepted.
     */
    const refused = await postReading(client, user, vivarium, {
      measuredAt: '2024-12-31T19:30',
      values: { ph: '7' },
    })
    assert.deepEqual(fieldErrors(refused, 'measuredAt'), [
      'The date cannot be before the set-up date of the tank',
    ])
    await postReading(client, user, vivarium, {
      measuredAt: '2025-01-01T00:30',
      values: { ph: '7' },
    })
    assert.deepEqual(await measuresOf(vivarium), ['2025-01-01T05:30:00Z ph=7'])
  })

  test('MEA-7 a new reading only accepts the types tracked by the vivarium', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7', no3: '10', unknown: '1' },
    })

    assert.deepEqual(fieldErrors(response, 'values.no3'), [
      'This parameter is not part of this reading',
    ])
    assert.deepEqual(fieldErrors(response, 'values.unknown'), [
      'This parameter is not part of this reading',
    ])
    assert.deepEqual(await measuresOf(vivarium), [])
  })

  test('MEA-13 in Europe/Paris, 18:00 is stored at 17:00 UTC in January and 16:00 UTC in July', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ timezone: 'Europe/Paris' }).create()
    const { vivarium } = await vivariumTracking(['ph'], user)

    await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7' },
    })
    await postReading(client, user, vivarium, {
      measuredAt: '2026-07-15T18:00',
      values: { ph: '7.1' },
    })

    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T17:00:00Z ph=7',
      '2026-07-15T16:00:00Z ph=7.1',
    ])

    for (const instant of ['2026-01-15T17:00:00Z', '2026-07-15T16:00:00Z']) {
      const edit = await client
        .get(`/vivariums/${vivarium.id}/readings/${instant}/edit`)
        .withInertia()
        .loginAs(user)
      const props = edit.inertiaProps as { editedReading: { localMeasuredAt: string } }
      assert.equal(props.editedReading.localMeasuredAt.slice(11), '18:00')
    }
  })

  test('MEA-14 a time skipped in the time zone is refused, an ambiguous one is its first occurrence', async ({
    client,
    assert,
  }) => {
    Settings.now = () => Date.parse('2028-01-01T00:00:00Z')
    const user = await UserFactory.merge({ timezone: 'Europe/Paris' }).create()
    const { vivarium } = await vivariumTracking(['ph'], user)

    const skipped = await postReading(client, user, vivarium, {
      measuredAt: '2027-03-28T02:30',
      values: { ph: '7' },
    })
    assert.deepEqual(fieldErrors(skipped, 'measuredAt'), [
      'This time does not exist in your time zone (change to summer time)',
    ])

    await postReading(client, user, vivarium, {
      measuredAt: '2027-10-31T02:30',
      values: { ph: '7' },
    })
    assert.deepEqual(await measuresOf(vivarium), ['2027-10-31T00:30:00Z ph=7'])
  })

  test('MEA-16 a value with more decimals than its type allows is refused', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['temperature', 'gh', 'no3'])

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { temperature: '25,35', gh: '8.5', no3: '10' },
    })

    assert.deepEqual(fieldErrors(response, 'values.temperature'), ['Enter at most 1 decimal'])
    assert.deepEqual(fieldErrors(response, 'values.gh'), ['Enter a whole number'])
    assert.deepEqual(fieldErrors(response, 'values.no3'), [])
    assert.deepEqual(await measuresOf(vivarium), [])

    /**
     * Trailing zeros are not decimals: "25,30" is 25,3.
     */
    await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { temperature: '25,30', gh: '8' },
    })
    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z gh=8',
      '2026-01-15T18:00:00Z temperature=25.3',
    ])
  })

  test('MEA-17 a reading is truncated to the minute, and the same minute joins its reading', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh'])

    await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:42:37',
      values: { ph: '7' },
    })
    await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:42',
      values: { kh: '6' },
    })

    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:42:00Z kh=6',
      '2026-01-15T18:42:00Z ph=7',
    ])
  })

  test('MEA-17 the default "now" of the form is truncated to the minute too', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    const now = DateTime.utc()

    await postReading(client, user, vivarium, {
      measuredAt: now.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"),
      values: { ph: '7' },
    })

    assert.deepEqual(await measuresOf(vivarium), [
      `${now.startOf('minute').toISO({ suppressMilliseconds: true })} ph=7`,
    ])
  })

  test('MEA-18 a new reading with a type already measured at this minute is refused as a whole', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh', 'no3'])
    await storeMeasures(vivarium, '2026-01-15T18:42:00Z', { ph: 7 })

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:42',
      values: { ph: '7.2', kh: '6', no3: '10' },
    })

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    assert.deepEqual(fieldErrors(response, 'measuredAt'), [
      'This reading already has a value of pH at this date and time. Edit the existing reading from the history.',
    ])
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:42:00Z ph=7'])

    /**
     * The unique index refuses a duplicate even without this check, as
     * from a form sent twice at once.
     */
    await assert.rejects(() => storeMeasures(vivarium, '2026-01-15T18:42:00Z', { ph: 7.2 }))
  })

  test('MEA-24 without tracked measures, the reading has no field and invites to add some', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking([])

    const dashboard = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    assert.deepEqual((dashboard.inertiaProps as { readingFields: unknown[] }).readingFields, [])

    const response = await postReading(client, user, vivarium, {
      measuredAt: '2026-01-15T18:00',
      values: { ph: '7' },
    })
    assert.deepEqual(fieldErrors(response, 'values.ph'), [
      'This parameter is not part of this reading',
    ])
  })

  test('MEA-24 the dashboard gives the fields of the tracked measures, in their order, with their rules', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['no3', 'temperature'])

    const dashboard = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)

    assert.deepEqual((dashboard.inertiaProps as { readingFields: unknown[] }).readingFields, [
      { code: 'no3', unit: 'mg/L', decimals: 1, min: 0, max: 500 },
      { code: 'temperature', unit: '°C', decimals: 1, min: -10, max: 60 },
    ])
  })
})
