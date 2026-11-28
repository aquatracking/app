import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { ApiResponse } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { waitForLockWaiters } from '#tests/helpers/locks'
import { UserFactory } from '#database/factories/user_factory'

/**
 * Administrators acting at the same time, on several connections
 * (docs/features/03-admin.md). The database is emptied by truncation
 * rather than rolled back, as a global transaction would merge the
 * connections into one (docs/architecture.md). The truncation also
 * empties the measure type catalog, seeded again for the other groups.
 */
test.group('Administration on several connections', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.teardown(() => testUtils.db().seed())

  test('ADM-14 two administrators deleting each other at the same time leave one administrator', async ({
    client,
    assert,
  }) => {
    /**
     * Seen recently: recording their activity does not write to their
     * row, which the test locks.
     */
    const [ada, grace] = await UserFactory.merge({
      isAdmin: true,
      lastSeenAt: DateTime.now(),
    }).createMany(2)

    /**
     * The lock on the administrators holds both deletions until both
     * wait on it.
     */
    const blocker = await db.transaction()
    let responses: ApiResponse[]
    try {
      await blocker.rawQuery('select id from users where is_admin for update')
      const deletions = Promise.all(
        [
          [ada, grace],
          [grace, ada],
        ].map(([actor, target]) =>
          client
            .delete(`/admin/users/${target.id}`)
            .withInertia()
            .header('referer', '/admin/users')
            .form({ email: target.email })
            .withCsrfToken()
            .loginAs(actor)
            .redirects(0)
        )
      )
      await waitForLockWaiters(2)
      await blocker.commit()
      responses = await deletions
    } finally {
      if (!blocker.isCompleted) {
        await blocker.rollback()
      }
    }

    assert.lengthOf(await User.query().where('is_admin', true), 1)
    assert.sameMembers(
      responses.map((response) => response.status()),
      [303, 403]
    )
  })
})
