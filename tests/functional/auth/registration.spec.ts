import { test } from '@japa/runner'
import User from '#models/user'
import type { ApiResponse } from '@japa/api-client'
import Invitation from '#models/invitation'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { InvitationFactory } from '#database/factories/invitation_factory'

/**
 * A pending invitation from an administrator, and the token of its link.
 */
async function invite(email = 'grace@example.com', options: { expired?: boolean } = {}) {
  const admin = await UserFactory.merge({ isAdmin: true }).create()
  const { token, tokenHash } = Invitation.generateToken()
  const factory = InvitationFactory.merge({ email, tokenHash, invitedById: admin.id })
  const invitation = options.expired
    ? await factory.apply('expired').create()
    : await factory.create()
  return { admin, invitation, token }
}

/**
 * A valid submission of the registration form.
 */
function registrationForm(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Grace',
    lastName: 'Hopper',
    password: 'secret-password',
    passwordConfirmation: 'secret-password',
    locale: 'fr',
    timezone: 'Europe/Paris',
    ...overrides,
  }
}

function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}

test.group('Registration by invitation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('AUTH-5 a valid invitation link shows the form with the email of the invitation', async ({
    client,
  }) => {
    const { token } = await invite('grace@example.com')

    const response = await client.get(`/invitations/${token}`).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('auth/register')
    response.assertInertiaPropsContains({ invitation: { email: 'grace@example.com' } })
  })

  test('AUTH-5 submitting the form creates a non-admin account, deletes the invitation and signs in', async ({
    client,
    assert,
  }) => {
    const { admin, invitation, token } = await invite('grace@example.com')

    const response = await client
      .post(`/invitations/${token}`)
      .withInertia()
      .form(registrationForm())
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const user = await User.findByOrFail('email', 'grace@example.com')
    assert.isFalse(user.isAdmin)
    assert.equal(user.firstName, 'Grace')
    assert.equal(user.lastName, 'Hopper')
    assert.equal(user.invitedById, admin.id)
    assert.isNull(await Invitation.find(invitation.id))
    response.assertSession('auth_web', user.id)
  })

  test('AUTH-5 the email cannot be changed: a submitted email is ignored', async ({
    client,
    assert,
  }) => {
    const { token } = await invite('grace@example.com')

    await client
      .post(`/invitations/${token}`)
      .withInertia()
      .form(registrationForm({ email: 'mallory@example.com' }))
      .withCsrfToken()
      .redirects(0)

    assert.isNotNull(await User.findBy('email', 'grace@example.com'))
    assert.isNull(await User.findBy('email', 'mallory@example.com'))
  })

  test('AUTH-6 an unknown, expired or used invitation shows the invalid message and creates no account', async ({
    client,
    assert,
  }) => {
    const expired = await invite('expired@example.com', { expired: true })
    const used = await invite('used@example.com')
    await client
      .post(`/invitations/${used.token}`)
      .withInertia()
      .form(registrationForm())
      .withCsrfToken()
    const usersBefore = await User.all()

    for (const token of ['unknown-token', expired.token, used.token]) {
      const show = await client.get(`/invitations/${token}`).withInertia()
      show.assertStatus(200)
      show.assertInertiaComponent('auth/register')
      show.assertInertiaPropsContains({ invitation: null })

      const store = await client
        .post(`/invitations/${token}`)
        .withInertia()
        .header('accept-language', 'en')
        .header('referer', `/invitations/${token}`)
        .form(registrationForm())
        .withCsrfToken()
        .redirects(0)
      store.assertHeader('location', `/invitations/${token}`)
      store.assertFlashMessage('notification', {
        type: 'error',
        message: 'This invitation is invalid or expired.',
      })
      store.assertSessionMissing('auth_web')
    }

    assert.lengthOf(await User.all(), usersBefore.length)
    assert.isNull(await User.findBy('email', 'expired@example.com'))
  })

  test('AUTH-6 an invitation whose email already has an account creates no account', async ({
    client,
    assert,
  }) => {
    const { token } = await invite('grace@example.com')
    await UserFactory.merge({ email: 'grace@example.com' }).create()

    const response = await client
      .post(`/invitations/${token}`)
      .withInertia()
      .header('accept-language', 'en')
      .form(registrationForm())
      .withCsrfToken()
      .redirects(0)

    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'This invitation is invalid or expired.',
    })
    assert.lengthOf(await User.query().where('email', 'grace@example.com'), 1)
  })

  test('AUTH-12 the form is prefilled with the browser language, English otherwise', async ({
    client,
  }) => {
    const { token } = await invite()

    const french = await client
      .get(`/invitations/${token}`)
      .header('accept-language', 'fr-FR,fr;q=0.9')
      .withInertia()
    french.assertInertiaPropsContains({ locale: 'fr' })

    const german = await client
      .get(`/invitations/${token}`)
      .header('accept-language', 'de-DE,de;q=0.9')
      .withInertia()
    german.assertInertiaPropsContains({ locale: 'en' })
  })

  test('AUTH-12 the registration saves the submitted language', async ({ client, assert }) => {
    const { token } = await invite('grace@example.com')

    await client
      .post(`/invitations/${token}`)
      .withInertia()
      .form(registrationForm({ locale: 'fr' }))
      .withCsrfToken()

    const user = await User.findByOrFail('email', 'grace@example.com')
    assert.equal(user.locale, 'fr')
  })

  test('AUTH-14 the registration saves the submitted time zone', async ({ client, assert }) => {
    const { token } = await invite('grace@example.com')

    await client
      .post(`/invitations/${token}`)
      .withInertia()
      .form(registrationForm({ timezone: 'America/Toronto' }))
      .withCsrfToken()

    const user = await User.findByOrFail('email', 'grace@example.com')
    assert.equal(user.timezone, 'America/Toronto')
  })

  test('AUTH-14 the form lists the time zones it accepts', async ({ client, assert }) => {
    const { token } = await invite('grace@example.com')

    const response = await client.get(`/invitations/${token}`).withInertia()

    const timezones = response.inertiaProps.timezones as string[]
    assert.includeMembers(timezones, ['UTC', 'Europe/Paris', 'America/Toronto'])
    assert.notIncludeMembers(timezones, ['Etc/GMT+5', 'EST'])
  })

  test('AUTH-14 a name that is not in the list of time zones is refused on the field')
    .with(['Mars/Olympus', '+01:00', 'Etc/GMT+5', 'EST'])
    .run(async ({ client, assert }, timezone) => {
      const { invitation, token } = await invite('grace@example.com')

      const response = await client
        .post(`/invitations/${token}`)
        .withInertia()
        .header('accept-language', 'en')
        .form(registrationForm({ timezone }))
        .withCsrfToken()
        .redirects(0)

      assert.deepEqual(fieldErrors(response, 'timezone'), ['Choose a time zone from the list'])
      assert.isNull(await User.findBy('email', 'grace@example.com'))
      assert.isNotNull(await Invitation.find(invitation.id))
    })

  test('AUTH-5 a blank last name is saved as none')
    .with(['', '   '])
    .run(async ({ client, assert }, lastName) => {
      const { token } = await invite('grace@example.com')

      const response = await client
        .post(`/invitations/${token}`)
        .withInertia()
        .form(registrationForm({ lastName }))
        .withCsrfToken()
        .redirects(0)

      response.assertHeader('location', '/')
      const user = await User.findByOrFail('email', 'grace@example.com')
      assert.isNull(user.lastName)
    })

  test('a signed-in user opening an invitation link is sent home with a message', async ({
    client,
    assert,
  }) => {
    const { admin, invitation, token } = await invite('grace@example.com')

    const response = await client
      .get(`/invitations/${token}`)
      .header('accept-language', 'en')
      .loginAs(admin)
      .redirects(0)

    response.assertHeader('location', '/')
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'You are already signed in.',
    })
    assert.isNotNull(await Invitation.find(invitation.id))
  })
})
