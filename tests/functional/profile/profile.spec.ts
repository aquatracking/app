import { test } from '@japa/runner'
import { TIMEZONES } from '#catalog/timezones'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { ApiResponse } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

function profileForm(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    locale: 'en',
    timezone: 'UTC',
    ...overrides,
  }
}

function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}

test.group('Profile', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the profile page shows the user', async ({ client }) => {
    const user = await UserFactory.merge({ firstName: 'Ada', timezone: 'Europe/Paris' }).create()

    const response = await client.get('/profile').withInertia().loginAs(user)

    response.assertStatus(200)
    response.assertInertiaComponent('profile/edit')
    response.assertInertiaPropsContains({
      user: { firstName: 'Ada', email: user.email },
      timezone: 'Europe/Paris',
    })
  })

  test('saving the profile changes the name, language and time zone', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await client
      .put('/profile')
      .withInertia()
      .loginAs(user)
      .form(profileForm({ lastName: '', locale: 'fr', timezone: 'America/Toronto' }))
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/profile')
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Votre profil a été enregistré.',
    })
    await user.refresh()
    assert.equal(user.firstName, 'Ada')
    assert.isNull(user.lastName)
    assert.equal(user.locale, 'fr')
    assert.equal(user.timezone, 'America/Toronto')
  })

  test('a profile saved without last name keeps the saved one', async ({ client, assert }) => {
    const user = await UserFactory.merge({ lastName: 'Byron' }).create()
    const { lastName, ...form } = profileForm({ firstName: 'Augusta' })
    assert.notEqual(lastName, 'Byron')

    const response = await client
      .put('/profile')
      .withInertia()
      .loginAs(user)
      .form(form)
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/profile')
    await user.refresh()
    assert.equal(user.firstName, 'Augusta')
    assert.equal(user.lastName, 'Byron')
  })

  test('AUTH-11 the profile form ignores a submitted email', async ({ client, assert }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()

    await client
      .put('/profile')
      .withInertia()
      .loginAs(user)
      .form({ ...profileForm(), email: 'mallory@example.com' })
      .withCsrfToken()

    await user.refresh()
    assert.equal(user.email, 'ada@example.com')
    assert.equal(user.firstName, 'Ada')
  })

  test('AUTH-11 changing the password without the right current password is refused', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()

    const response = await client
      .put('/profile/password')
      .withInertia()
      .loginAs(user)
      .header('accept-language', 'en')
      .form({
        currentPassword: 'wrong-password',
        password: 'new-secret-password',
        passwordConfirmation: 'new-secret-password',
      })
      .withCsrfToken()
      .redirects(0)

    assert.deepEqual(fieldErrors(response, 'currentPassword'), [
      'The current password is incorrect',
    ])
    await User.verifyCredentials('ada@example.com', 'secret-password')
  })

  test('AUTH-11 changing the password with the current one signs out the other devices only', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()
    const otherDevice = await User.rememberMeTokens.create(user, '1 year')
    const currentDevice = await User.rememberMeTokens.create(user, '1 year')

    const response = await client
      .put('/profile/password')
      .withInertia()
      .loginAs(user)
      .withEncryptedCookie('remember_web', currentDevice.value!.release())
      .header('accept-language', 'en')
      .form({
        currentPassword: 'secret-password',
        password: 'new-secret-password',
        passwordConfirmation: 'new-secret-password',
      })
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/profile')
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'Your password has been changed.',
    })
    await User.verifyCredentials('ada@example.com', 'new-secret-password')
    const tokens = await db.from('remember_me_tokens').where('tokenable_id', user.id)
    assert.deepEqual(
      tokens.map((token) => String(token.id)),
      [String(currentDevice.identifier)]
    )
    assert.notEqual(String(otherDevice.identifier), String(currentDevice.identifier))
  })

  test('AUTH-12 choosing a language changes the language of the next page', async ({ client }) => {
    const user = await UserFactory.merge({ locale: 'en' }).create()

    await client
      .put('/profile')
      .withInertia()
      .loginAs(user)
      .form(profileForm({ locale: 'fr' }))
      .withCsrfToken()

    const response = await client
      .get('/profile')
      .header('accept-language', 'en')
      .withInertia()
      .loginAs(user)
    response.assertInertiaPropsContains({ locale: 'fr' })
  })

  test('AUTH-15 changing the time zone changes the displayed zone, not the stored instants', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ timezone: 'Europe/Paris' }).create()
    const instantsBefore = await db.from('users').where('id', user.id).select('created_at').first()

    await client
      .put('/profile')
      .withInertia()
      .loginAs(user)
      .form(profileForm({ timezone: 'America/Toronto' }))
      .withCsrfToken()

    const response = await client.get('/profile').withInertia().loginAs(user)
    response.assertInertiaPropsContains({ timezone: 'America/Toronto' })
    const instantsAfter = await db.from('users').where('id', user.id).select('created_at').first()
    assert.equal(instantsAfter.created_at.getTime(), instantsBefore.created_at.getTime())
  })

  test('AUTH-16 the profile page lists the time zones it accepts', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await client.get('/profile').withInertia().loginAs(user)

    assert.deepEqual(response.inertiaProps.timezones, TIMEZONES)
  })

  test('AUTH-16 every time zone of the list is known by Intl and PostgreSQL', async ({
    assert,
  }) => {
    assert.includeMembers(TIMEZONES, ['UTC', 'Asia/Kolkata', 'Europe/Kyiv', 'America/Nuuk'])
    assert.notIncludeMembers(TIMEZONES, ['Asia/Calcutta', 'Europe/Kiev', 'Etc/GMT+5', 'EST'])
    assert.equal(new Set(TIMEZONES).size, TIMEZONES.length)

    for (const timezone of TIMEZONES) {
      assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: timezone }), timezone)
      /**
       * The charts convert instants with "AT TIME ZONE", which fails on a
       * name PostgreSQL does not know.
       */
      await db.rawQuery('select now() at time zone ?', [timezone])
    }
  })

  test('AUTH-16 a name that is not in the list of time zones is refused')
    .with(['Mars/Olympus', '+01:00', 'UTC+1', 'Etc/GMT+5', 'EST', 'Asia/Calcutta'])
    .run(async ({ client, assert }, timezone) => {
      const user = await UserFactory.merge({ timezone: 'Europe/Paris' }).create()

      const response = await client
        .put('/profile')
        .withInertia()
        .loginAs(user)
        .header('accept-language', 'en')
        .form(profileForm({ timezone }))
        .withCsrfToken()
        .redirects(0)

      assert.deepEqual(fieldErrors(response, 'timezone'), ['Choose a time zone from the list'])
      await user.refresh()
      assert.equal(user.timezone, 'Europe/Paris')
    })
})
