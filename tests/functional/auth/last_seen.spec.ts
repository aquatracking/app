import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

/**
 * The stored "last_seen_at" and "updated_at" of a user, in milliseconds.
 */
async function storedDates(user: User) {
  const row = await db.from('users').where('id', user.id).first()
  return {
    lastSeenAt: row.last_seen_at ? row.last_seen_at.getTime() : null,
    updatedAt: row.updated_at.getTime(),
  }
}

async function setLastSeen(user: User, lastSeenAt: DateTime | null) {
  await db
    .from('users')
    .where('id', user.id)
    .update({ last_seen_at: lastSeenAt?.toSQL() ?? null })
}

test.group('Last activity', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('ADM-13 a request of a signed-in user records their last activity', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const before = await storedDates(user)
    assert.isNull(before.lastSeenAt)

    await client.get('/').withInertia().loginAs(user)

    const after = await storedDates(user)
    assert.isNotNull(after.lastSeenAt)
    assert.closeTo(after.lastSeenAt!, Date.now(), 5000)
    assert.equal(after.updatedAt, before.updatedAt)
  })

  test('ADM-13 a session restored by "remember me" records the last activity', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const token = await User.rememberMeTokens.create(user, '1 year')

    const response = await client
      .get('/')
      .withEncryptedCookie('remember_web', token.value!.release())
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('home')
    const { lastSeenAt } = await storedDates(user)
    assert.isNotNull(lastSeenAt)
  })

  test('ADM-13 the last activity is written at most once per hour', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const recently = DateTime.now().minus({ minutes: 30 })
    await setLastSeen(user, recently)

    await client.get('/').withInertia().loginAs(user)
    const unchanged = await storedDates(user)
    assert.equal(unchanged.lastSeenAt, recently.toMillis())

    const longAgo = DateTime.now().minus({ minutes: 61 })
    await setLastSeen(user, longAgo)
    const before = await storedDates(user)

    await client.get('/').withInertia().loginAs(user)

    const after = await storedDates(user)
    assert.isAbove(after.lastSeenAt!, longAgo.toMillis())
    assert.equal(after.updatedAt, before.updatedAt)
  })

  test('ADM-13 a guest request records nothing', async ({ client, assert }) => {
    const user = await UserFactory.create()

    await client.get('/login').withInertia()

    const { lastSeenAt } = await storedDates(user)
    assert.isNull(lastSeenAt)
  })
})
