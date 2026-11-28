import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import type { ApiResponse } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { waitForLockWaiters } from '#tests/helpers/locks'
import {
  deleteReading,
  measuresOf,
  postReading,
  putReading,
  storeMeasures,
  vivariumTracking,
} from '#tests/helpers/measures'
import { fieldErrors } from '#tests/helpers/responses'
import { sendDuringArchiving } from '#tests/helpers/vivariums'

/**
 * Changes of readings that overlap, on several connections
 * (docs/features/06-measures.md). The database is emptied by truncation
 * rather than rolled back, as a global transaction would merge the
 * connections into one (docs/architecture.md). The truncation also
 * empties the measure type catalog, seeded before each test and again
 * for the other groups.
 */
test.group('Readings on several connections', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => testUtils.db().seed())
  group.teardown(() => testUtils.db().seed())

  test('MEA-18 two simultaneous submissions of a reading create it once and refuse the other as a conflict', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph', 'kh'])

    /**
     * The lock lets both requests check that the minute is free, then
     * blocks their insertions until both wait on it: the second one
     * then violates the unique index.
     */
    const blocker = await db.transaction()
    let responses: ApiResponse[]
    try {
      await blocker.rawQuery('LOCK TABLE measures IN SHARE MODE')
      const submissions = Promise.all(
        [1, 2].map(() =>
          postReading(client, user, vivarium, {
            measuredAt: '2026-01-15T18:00',
            values: { ph: '7.2', kh: '6' },
          })
        )
      )
      await waitForLockWaiters(2)
      await blocker.commit()
      responses = await submissions
    } finally {
      if (!blocker.isCompleted) {
        await blocker.rollback()
      }
    }

    assert.deepEqual(await measuresOf(vivarium), [
      '2026-01-15T18:00:00Z kh=6',
      '2026-01-15T18:00:00Z ph=7.2',
    ])
    for (const response of responses) {
      response.assertStatus(302)
      response.assertHeader('location', `/vivariums/${vivarium.id}`)
    }
    assert.sameDeepMembers(
      responses.map((response) => fieldErrors(response, 'measuredAt')),
      [
        [],
        [
          'This reading already has a value of pH and Carbonate hardness (KH) at this date and time. Edit the existing reading from the history.',
        ],
      ]
    )
  })

  test('MEA-25 saving a reading moved in another tab while the save waits answers 404 and creates nothing', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })

    /**
     * The save finds the reading, then waits for the lock on its
     * measures, which the other tab holds while it moves them.
     */
    const blocker = await db.transaction()
    let response: ApiResponse
    try {
      await blocker.rawQuery('select id from measures where vivarium_id = ? for update', [
        vivarium.id,
      ])
      /**
       * A request is sent when awaited: Promise.resolve sends it now.
       */
      const save = Promise.resolve(
        putReading(client, user, vivarium, '2026-01-15T18:00:00Z', {
          measuredAt: '2026-01-15T18:00',
          values: { ph: '7.2' },
        })
      )
      await waitForLockWaiters(1)
      await blocker.rawQuery(
        `update measures set measured_at = '2026-01-15T19:00:00Z' where vivarium_id = ?`,
        [vivarium.id]
      )
      await blocker.commit()
      response = await save
    } finally {
      if (!blocker.isCompleted) {
        await blocker.rollback()
      }
    }

    response.assertStatus(404)
    assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T19:00:00Z ph=7'])
  })

  test(
    'MEA-30 a reading {$self} sent while the vivarium is archived is refused once the archiving is done'
  )
    .with(['creation', 'edit', 'deletion'] as const)
    .run(async ({ client, assert }, action) => {
      const { user, vivarium } = await vivariumTracking(['ph'])
      await storeMeasures(vivarium, '2026-01-15T18:00:00Z', { ph: 7 })
      const reading = { measuredAt: '2026-01-15T18:00', values: { ph: '7.2' } }

      const response = await sendDuringArchiving(vivarium, () => {
        switch (action) {
          case 'creation':
            return postReading(client, user, vivarium, {
              ...reading,
              measuredAt: '2026-01-16T18:00',
            })
          case 'edit':
            return putReading(client, user, vivarium, '2026-01-15T18:00:00Z', reading)
          case 'deletion':
            return deleteReading(client, user, vivarium, '2026-01-15T18:00:00Z')
        }
      })

      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'This tank is archived: unarchive it to change it.',
      })
      assert.deepEqual(await measuresOf(vivarium), ['2026-01-15T18:00:00Z ph=7'])
    })
})
