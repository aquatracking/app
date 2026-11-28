import { test } from '@japa/runner'
import { TIMEZONES } from '#catalog/timezones'
import type { ApiResponse } from '@japa/api-client'
import User from '#models/user'
import { SetupService } from '#services/setup_service'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import { waitForLockWaiters } from '#tests/helpers/locks'

/**
 * A valid submission of the setup form.
 */
function setupForm(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'Ada@Example.com',
    password: 'secret-password',
    passwordConfirmation: 'secret-password',
    locale: 'fr',
    timezone: 'Europe/Paris',
    ...overrides,
  }
}

/**
 * Validation errors of a field, as flashed for the next page.
 */
function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}

/**
 * The database is emptied by truncation rather than rolled back: INS-5
 * needs two requests on two connections, which a global transaction
 * would merge into one. The truncation also empties the measure type
 * catalog, seeded again for the other groups.
 */
test.group('Setup', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.teardown(() => testUtils.db().seed())
  group.each.setup(() => SetupService.forget())
  group.each.setup(() => limiter.clear())

  test('INS-1 with an empty database, the home page redirects to the setup', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/setup')
  })

  test('INS-2 with an empty database, liveness answers 200 without a redirection', async ({
    client,
  }) => {
    const response = await client.get('/health/live').redirects(0)

    response.assertStatus(200)
    response.assertBody({ status: 'ok' })
  })

  test('INS-3 a valid submission creates an administrator, signs them in and redirects home', async ({
    client,
    assert,
  }) => {
    const show = await client.get('/setup').withInertia()
    show.assertStatus(200)
    show.assertInertiaComponent('setup/show')

    const response = await client
      .post('/setup')
      .withInertia()
      .form(setupForm())
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const admin = await User.findByOrFail('email', 'ada@example.com')
    assert.isTrue(admin.isAdmin)
    assert.equal(admin.firstName, 'Ada')
    assert.equal(admin.lastName, 'Lovelace')
    assert.equal(admin.locale, 'fr')
    assert.isNull(admin.invitedById)
    response.assertSession('auth_web', admin.id)
  })

  test('INS-3 the last name is optional', async ({ client, assert }) => {
    const response = await client
      .post('/setup')
      .withInertia()
      .form(setupForm({ lastName: '' }))
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/')
    const admin = await User.findByOrFail('email', 'ada@example.com')
    assert.isNull(admin.lastName)
  })

  test('INS-9 an email of more than 254 characters is refused on the field', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/setup')
      .withInertia()
      .header('accept-language', 'en')
      .form(setupForm({ email: `${'a'.repeat(10)}@${`${'b'.repeat(60)}.`.repeat(4)}com` }))
      .withCsrfToken()
      .redirects(0)

    assert.deepEqual(fieldErrors(response, 'email'), ['Enter at most 254 characters'])
    assert.lengthOf(await User.all(), 0)
  })

  test('INS-4 once installed, the setup routes answer 404', async ({ client }) => {
    await User.create({ firstName: 'Ada', email: 'ada@example.com', password: 'secret-password' })

    const show = await client.get('/setup')
    show.assertStatus(404)

    const store = await client
      .post('/setup')
      .withInertia()
      .form(setupForm({ email: 'grace@example.com' }))
      .withCsrfToken()
    store.assertStatus(404)
  })

  test('INS-4 once installed, the home page no longer redirects to the setup', async ({
    client,
  }) => {
    const user = await User.create({
      firstName: 'Ada',
      email: 'ada@example.com',
      password: 'secret-password',
    })

    const response = await client.get('/').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('vivariums/index')
  })

  test('INS-4 the installed state is remembered without querying the users again', async ({
    client,
  }) => {
    await client.post('/setup').withInertia().form(setupForm()).withCsrfToken().redirects(0)

    /**
     * Emptied behind the application's back: only the remembered state
     * can still tell that the instance is installed.
     */
    await db.from('users').delete()

    const response = await client.get('/setup')
    response.assertStatus(404)
  })

  test('INS-5 two simultaneous valid submissions create only one user', async ({
    client,
    assert,
  }) => {
    /**
     * To make the two submissions overlap, the test holds a lock on
     * "users" that blocks every insertion, and releases it once both
     * requests are waiting on it. Without the lock of the service, both
     * would have checked that no user exists before waiting to insert.
     */
    const blocker = await db.transaction()
    let responses
    try {
      await blocker.rawQuery('LOCK TABLE users IN SHARE MODE')

      const submissions = Promise.all(
        ['ada@example.com', 'grace@example.com'].map((email) =>
          client
            .post('/setup')
            .withInertia()
            .form(setupForm({ email }))
            .withCsrfToken()
            .redirects(0)
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

    assert.lengthOf(await User.all(), 1)
    assert.sameMembers(
      responses.map((response) => response.status()),
      [302, 404]
    )
  })

  test('INS-6 a password shorter than 8 characters is refused on the field', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/setup')
      .withInertia()
      .header('accept-language', 'en')
      .form(setupForm({ password: 'short', passwordConfirmation: 'short' }))
      .withCsrfToken()
      .redirects(0)

    assert.deepEqual(fieldErrors(response, 'password'), ['Enter at least 8 characters'])
    assert.lengthOf(await User.all(), 0)
  })

  test('INS-6 a different confirmation is refused on the field', async ({ client, assert }) => {
    const response = await client
      .post('/setup')
      .withInertia()
      .header('accept-language', 'fr')
      .form(setupForm({ passwordConfirmation: 'other-password' }))
      .withCsrfToken()
      .redirects(0)

    assert.deepEqual(fieldErrors(response, 'passwordConfirmation'), [
      'La confirmation ne correspond pas',
    ])
    assert.deepEqual(fieldErrors(response, 'password'), [])
    assert.lengthOf(await User.all(), 0)
  })

  test('INS-7 the submitted time zone is saved on the administrator', async ({
    client,
    assert,
  }) => {
    await client
      .post('/setup')
      .withInertia()
      .form(setupForm({ timezone: 'America/Toronto' }))
      .withCsrfToken()
      .redirects(0)

    const admin = await User.findByOrFail('email', 'ada@example.com')
    assert.equal(admin.timezone, 'America/Toronto')
  })

  test('INS-7 the case of the time zone is corrected', async ({ client, assert }) => {
    await client
      .post('/setup')
      .withInertia()
      .form(setupForm({ timezone: 'europe/paris' }))
      .withCsrfToken()
      .redirects(0)

    const admin = await User.findByOrFail('email', 'ada@example.com')
    assert.equal(admin.timezone, 'Europe/Paris')
  })

  test('INS-7 the form lists the time zones it accepts', async ({ client, assert }) => {
    const response = await client.get('/setup').withInertia()

    assert.deepEqual(response.inertiaProps.timezones, TIMEZONES)
  })

  test('INS-7 a name that is not in the list of time zones is refused on the field')
    .with(['Mars/Olympus_Mons', '+01:00', 'UTC+1', 'Etc/GMT+5', 'EST'])
    .run(async ({ client, assert }, timezone) => {
      const response = await client
        .post('/setup')
        .withInertia()
        .header('accept-language', 'en')
        .form(setupForm({ timezone }))
        .withCsrfToken()
        .redirects(0)

      assert.deepEqual(fieldErrors(response, 'timezone'), ['Choose a time zone from the list'])
      assert.lengthOf(await User.all(), 0)
    })

  test('INS-8 submissions are limited to 10 per minute and per IP', async ({ client }) => {
    const invalidForm = setupForm({ password: 'short' })

    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await client.post('/setup').form(invalidForm).withCsrfToken().redirects(0)
      response.assertStatus(302)
    }

    const response = await client.post('/setup').form(invalidForm).withCsrfToken().redirects(0)
    response.assertStatus(429)
  })

  test('INS-8 an Inertia submission over the limit gets a notification', async ({ client }) => {
    const invalidForm = setupForm({ password: 'short' })

    for (let attempt = 1; attempt <= 10; attempt++) {
      await client.post('/setup').form(invalidForm).withCsrfToken().redirects(0)
    }

    const response = await client
      .post('/setup')
      .header('accept-language', 'en')
      .header('referer', '/setup')
      .withInertia()
      .form(invalidForm)
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/setup')
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'Too many attempts. Please try again in a moment.',
    })
  })
})
