import { test } from '@japa/runner'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { UserFactory } from '#database/factories/user_factory'
import limiter from '@adonisjs/limiter/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { loginLimiterKeys } from '#services/login_service'
import type { ApiClient } from '@japa/api-client'

/**
 * The test client connects to "localhost", seen by the server under one
 * of these addresses depending on the system.
 */
const CLIENT_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

function login(
  client: ApiClient,
  email: string,
  password: string,
  options: { rememberMe?: boolean } = {}
) {
  return client
    .post('/login')
    .withInertia()
    .header('accept-language', 'en')
    .header('referer', '/login')
    .form({ email, password, ...(options.rememberMe ? { rememberMe: 'true' } : {}) })
    .withCsrfToken()
    .redirects(0)
}

async function failLogins(client: ApiClient, email: string, count: number) {
  for (let attempt = 1; attempt <= count; attempt++) {
    const response = await login(client, email, 'wrong-password')
    response.assertFlashMessage('notification', { type: 'error', message: 'Invalid credentials.' })
  }
}

/**
 * Simulates the passing of the 15 minutes of the counters: they are
 * forgotten with their blocks, the history of the blocks is not.
 */
async function endBlock(email: string) {
  for (const ip of CLIENT_IPS) {
    const keys = loginLimiterKeys(ip, email)
    await limiter.use({ requests: 5, duration: '15 minutes' }).delete(keys.ipAndEmail)
    await limiter.use({ requests: 20, duration: '15 minutes' }).delete(keys.ip)
  }
}

function blockedMessage(duration: string) {
  return {
    type: 'error',
    message: `Too many failed attempts. Please try again in ${duration}.`,
  }
}

test.group('Login', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => limiter.clear())

  test('AUTH-1 valid credentials sign the user in and redirect home', async ({ client }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()

    const show = await client.get('/login').withInertia()
    show.assertStatus(200)
    show.assertInertiaComponent('auth/login')

    const response = await login(client, 'Ada@Example.com', 'secret-password')

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertSession('auth_web', user.id)
  })

  test('AUTH-1 after login, the user goes to the page they asked for', async ({ client }) => {
    const user = await UserFactory.create()

    const protectedPage = await client.get('/profile').redirects(0)
    protectedPage.assertHeader('location', '/login')

    const response = await client
      .post('/login')
      .withSession(protectedPage.session())
      .withInertia()
      .form({ email: user.email, password: 'secret-password' })
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/profile')
    response.assertSession('auth_web', user.id)
  })

  test('AUTH-2 an unknown email and a wrong password give the same message', async ({ client }) => {
    await UserFactory.merge({ email: 'ada@example.com' }).create()

    const unknownEmail = await login(client, 'grace@example.com', 'secret-password')
    const wrongPassword = await login(client, 'ada@example.com', 'wrong-password')

    for (const response of [unknownEmail, wrongPassword]) {
      response.assertStatus(302)
      response.assertHeader('location', '/login')
      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'Invalid credentials.',
      })
      response.assertSessionMissing('auth_web')
    }
  })

  test('AUTH-3 after 5 failures for an email and an IP, even the right password is refused', async ({
    client,
  }) => {
    const user = await UserFactory.create()
    await failLogins(client, user.email, 5)

    const response = await login(client, user.email, 'secret-password')

    response.assertStatus(302)
    response.assertFlashMessage('notification', blockedMessage('15 minutes'))
    response.assertSessionMissing('auth_web')
  })

  test('AUTH-3 the block message follows the language of the browser', async ({ client }) => {
    const user = await UserFactory.create()
    await failLogins(client, user.email, 5)

    const response = await client
      .post('/login')
      .withInertia()
      .header('accept-language', 'fr')
      .form({ email: user.email, password: 'secret-password' })
      .withCsrfToken()
      .redirects(0)

    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'Trop de tentatives échouées. Réessayez dans 15 minutes.',
    })
  })

  test('AUTH-3 failures on another email do not block the account', async ({ client }) => {
    const user = await UserFactory.create()
    await failLogins(client, 'grace@example.com', 5)

    const response = await login(client, user.email, 'secret-password')

    response.assertSession('auth_web', user.id)
  })

  test('AUTH-4 "remember me" creates a remember me token', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await login(client, user.email, 'secret-password', { rememberMe: true })

    response.assertSession('auth_web', user.id)
    assert.exists(response.cookie('remember_web'))
    const tokens = await db.from('remember_me_tokens').where('tokenable_id', user.id)
    assert.lengthOf(tokens, 1)
    assert.isAbove(tokens[0].expires_at.getTime(), Date.now() + 364 * 24 * 3600 * 1000)
  })

  test('AUTH-4 without "remember me", no remember me token is created', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await login(client, user.email, 'secret-password')

    response.assertSession('auth_web', user.id)
    assert.lengthOf(await db.from('remember_me_tokens').where('tokenable_id', user.id), 0)
  })

  test('AUTH-13 a protected page requested without being signed in redirects to the login', async ({
    client,
  }) => {
    await UserFactory.create()

    for (const url of ['/', '/profile']) {
      const response = await client.get(url).redirects(0)
      response.assertStatus(302)
      response.assertHeader('location', '/login')
    }
  })

  test('AUTH-17 after 20 failures from an IP on different emails, the IP is refused', async ({
    client,
  }) => {
    const user = await UserFactory.create()
    for (let index = 1; index <= 20; index++) {
      const response = await login(client, `unknown-${index}@example.com`, 'wrong-password')
      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'Invalid credentials.',
      })
    }

    const response = await login(client, user.email, 'secret-password')

    response.assertFlashMessage('notification', blockedMessage('15 minutes'))
    response.assertSessionMissing('auth_web')
  })

  test('AUTH-17 a forged X-Forwarded-For header does not change the IP of an untrusted client', async ({
    client,
  }) => {
    const user = await UserFactory.create()
    for (let index = 1; index <= 20; index++) {
      await client
        .post('/login')
        .withInertia()
        .header('x-forwarded-for', `203.0.113.${index}`)
        .form({ email: `unknown-${index}@example.com`, password: 'wrong-password' })
        .withCsrfToken()
        .redirects(0)
    }

    const response = await login(client, user.email, 'secret-password')

    response.assertFlashMessage('notification', blockedMessage('15 minutes'))
  })

  test('AUTH-18 a second block of the same key lasts 30 minutes, a third one 1 hour', async ({
    client,
  }) => {
    const user = await UserFactory.create()

    await failLogins(client, user.email, 5)
    const first = await login(client, user.email, 'secret-password')
    first.assertFlashMessage('notification', blockedMessage('15 minutes'))

    await endBlock(user.email)
    await failLogins(client, user.email, 5)
    const second = await login(client, user.email, 'secret-password')
    second.assertFlashMessage('notification', blockedMessage('30 minutes'))

    await endBlock(user.email)
    await failLogins(client, user.email, 5)
    const third = await login(client, user.email, 'secret-password')
    third.assertFlashMessage('notification', blockedMessage('1 hour'))
  })

  test('AUTH-18 a block never lasts more than 24 hours', async ({ client }) => {
    const user = await UserFactory.create()

    for (let block = 1; block <= 8; block++) {
      await endBlock(user.email)
      await failLogins(client, user.email, 5)
    }
    const eighth = await login(client, user.email, 'secret-password')
    eighth.assertFlashMessage('notification', blockedMessage('24 hours'))

    await endBlock(user.email)
    await failLogins(client, user.email, 5)
    const ninth = await login(client, user.email, 'secret-password')
    ninth.assertFlashMessage('notification', blockedMessage('24 hours'))
  })

  test('AUTH-19 a successful login resets the IP + email counter', async ({ client }) => {
    const user = await UserFactory.create()

    await failLogins(client, user.email, 4)
    const success = await login(client, user.email, 'secret-password')
    success.assertSession('auth_web', user.id)

    await failLogins(client, user.email, 4)
    const response = await login(client, user.email, 'secret-password')

    response.assertSession('auth_web', user.id)
  })

  test('AUTH-19 a successful login does not reset the IP counter', async ({ client }) => {
    const user = await UserFactory.create()
    for (let index = 1; index <= 19; index++) {
      await login(client, `unknown-${index}@example.com`, 'wrong-password')
    }

    const success = await login(client, user.email, 'secret-password')
    success.assertSession('auth_web', user.id)

    await login(client, 'unknown-20@example.com', 'wrong-password')
    const response = await login(client, user.email, 'secret-password')

    response.assertFlashMessage('notification', blockedMessage('15 minutes'))
    response.assertSessionMissing('auth_web')
  })

  test('AUTH-3 simultaneous attempts cannot check more than 5 passwords', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => login(client, user.email, 'wrong-password'))
    )

    const checked = responses.filter(
      (response) =>
        (response.flashMessages().notification as { message: string } | undefined)?.message ===
        'Invalid credentials.'
    )
    assert.lengthOf(checked, 5)
    const afterwards = await login(client, user.email, 'secret-password')
    afterwards.assertFlashMessage('notification', blockedMessage('15 minutes'))
  })

  test('logging out ends the session, deletes the remember me token and goes to the login', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const token = await User.rememberMeTokens.create(user, '1 year')

    const response = await client
      .post('/logout')
      .loginAs(user)
      .withEncryptedCookie('remember_web', token.value!.release())
      .withInertia()
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/login')
    response.assertSessionMissing('auth_web')
    assert.lengthOf(await db.from('remember_me_tokens').where('tokenable_id', user.id), 0)
  })

  test('a signed-in user opening a page for visitors is sent home', async ({ client }) => {
    const user = await UserFactory.create()

    for (const url of ['/login', '/forgot-password', '/reset-password/any-token']) {
      const response = await client
        .get(url)
        .header('accept-language', 'en')
        .loginAs(user)
        .redirects(0)

      response.assertHeader('location', '/')
      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'You are already signed in.',
      })
    }
  })
})
