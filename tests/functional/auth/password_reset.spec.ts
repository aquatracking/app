import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import limiter from '@adonisjs/limiter/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import PasswordResetToken from '#models/password_reset_token'
import { UserFactory } from '#database/factories/user_factory'
import { PasswordResetService } from '#services/password_reset_service'
import PasswordResetNotification from '#mails/password_reset_notification'

const SENT_MESSAGE = {
  type: 'success',
  message:
    'If an account uses this email, a link to choose a new password has been sent to it. It is valid for 1 hour.',
}

function requestLink(client: ApiClient, email: string) {
  return client
    .post('/forgot-password')
    .withInertia()
    .header('accept-language', 'en')
    .header('referer', '/forgot-password')
    .form({ email })
    .withCsrfToken()
    .redirects(0)
}

function resetPassword(client: ApiClient, token: string, password = 'new-secret-password') {
  return client
    .post(`/reset-password/${token}`)
    .withInertia()
    .header('accept-language', 'en')
    .header('referer', `/reset-password/${token}`)
    .form({ password, passwordConfirmation: password })
    .withCsrfToken()
    .redirects(0)
}

async function assertPassword(assert: any, email: string, password: string) {
  const user = await User.verifyCredentials(email, password)
  assert.equal(user.email, email)
}

/**
 * The instance sends emails or not depending on SMTP_HOST: each test
 * chooses, and the configured value is restored after it.
 */
function useMail(enabled: boolean) {
  app.config.set('app.mail.enabled', enabled)
}

test.group('Password reset', (group) => {
  const configured = app.config.get<boolean>('app.mail.enabled')

  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => limiter.clear())
  group.each.setup(() => useMail(true))
  group.each.teardown(() => useMail(configured))
  group.each.teardown(() => mail.restore())

  test('AUTH-7 with SMTP, an existing account receives a link in its language', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const user = await UserFactory.merge({ email: 'ada@example.com', locale: 'fr' }).create()

    const show = await client.get('/forgot-password').withInertia()
    show.assertInertiaComponent('auth/forgot_password')
    show.assertInertiaPropsContains({ mailEnabled: true })

    const response = await requestLink(client, 'Ada@Example.com')

    response.assertHeader('location', '/forgot-password')
    response.assertFlashMessage('notification', SENT_MESSAGE)
    mails.assertQueuedCount(PasswordResetNotification, 1)
    mails.assertQueued(PasswordResetNotification, ({ message }) => {
      message.assertTo('ada@example.com')
      message.assertSubject('Choisissez un nouveau mot de passe')
      message.assertTextIncludes(/http:\/\/localhost:\d+\/reset-password\/[\w-]+/)
      message.assertHtmlIncludes('Ce lien est valable 1 heure')
      return true
    })
    assert.lengthOf(await PasswordResetToken.query().where('userId', user.id), 1)
  })

  test('AUTH-7 the link of the email opens the reset form', async ({ client }) => {
    const { mails } = mail.fake()
    await UserFactory.merge({ email: 'ada@example.com' }).create()
    await requestLink(client, 'ada@example.com')

    const [sent] = mails.queued()
    const text = sent.message.toJSON().message.text as string
    const path = new URL(text.match(/http\S+/)![0]).pathname

    const response = await client.get(path).withInertia()
    response.assertInertiaComponent('auth/reset_password')
    response.assertInertiaPropsContains({ valid: true })
  })

  test('AUTH-7 the text part of the email is plain text, without HTML entities', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    await UserFactory.merge({
      email: 'ada@example.com',
      firstName: "D'Arcy & Co",
      locale: 'fr',
    }).create()

    await requestLink(client, 'ada@example.com')

    const [sent] = mails.queued()
    const text = sent.message.toJSON().message.text as string
    assert.include(text, "Bonjour D'Arcy & Co,")
    assert.include(text, "Si vous n'êtes pas à l'origine de cette demande")
    assert.notMatch(text, /&#?\w+;/)
  })

  test('AUTH-7 an unknown email receives nothing, with the same answer', async ({ client }) => {
    const { mails } = mail.fake()
    await UserFactory.merge({ email: 'ada@example.com' }).create()

    const response = await requestLink(client, 'grace@example.com')

    response.assertHeader('location', '/forgot-password')
    response.assertFlashMessage('notification', SENT_MESSAGE)
    mails.assertNoneQueued()
    mails.assertNoneSent()
  })

  test('AUTH-7 requests are limited to 3 per hour and per IP', async ({ client }) => {
    mail.fake()

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await requestLink(client, `unknown-${attempt}@example.com`)
      response.assertFlashMessage('notification', SENT_MESSAGE)
    }

    const response = await requestLink(client, 'unknown-4@example.com')
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'Too many attempts. Please try again in a moment.',
    })
  })

  test('AUTH-8 without SMTP, the page has no form and sends to an administrator', async ({
    client,
  }) => {
    useMail(false)
    const { mails } = mail.fake()
    await UserFactory.merge({ email: 'ada@example.com' }).create()

    const show = await client.get('/forgot-password').withInertia()
    show.assertInertiaComponent('auth/forgot_password')
    show.assertInertiaPropsContains({ mailEnabled: false })

    const response = await requestLink(client, 'ada@example.com')
    response.assertStatus(404)
    mails.assertNoneQueued()
  })

  test('AUTH-9 an expired, used, replaced or unknown link is refused as soon as it is shown', async ({
    client,
  }) => {
    const user = await UserFactory.create()
    const service = new PasswordResetService()

    const expired = await service.createToken(user)
    await PasswordResetToken.query()
      .where('userId', user.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    const replaced = await service.createToken(user)
    const used = await service.createToken(user)
    await resetPassword(client, used)

    for (const token of [expired, replaced, used, 'unknown-token']) {
      const response = await client.get(`/reset-password/${token}`).withInertia()
      response.assertInertiaComponent('auth/reset_password')
      response.assertInertiaPropsContains({ valid: false })
    }
  })

  test('AUTH-9 a refused link does not change the password', async ({ client, assert }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()
    const service = new PasswordResetService()
    const replaced = await service.createToken(user)
    await service.createToken(user)

    const response = await resetPassword(client, replaced)

    response.assertHeader('location', `/reset-password/${replaced}`)
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'This link is invalid, expired or already used.',
    })
    response.assertSessionMissing('auth_web')
    await assertPassword(assert, 'ada@example.com', 'secret-password')
  })

  test('AUTH-10 a reset changes the password, uses up the link and deletes the remember me tokens', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()
    await User.rememberMeTokens.create(user, '1 year')
    await User.rememberMeTokens.create(user, '1 year')
    const token = await new PasswordResetService().createToken(user)

    const response = await resetPassword(client, token)

    response.assertHeader('location', '/')
    response.assertSession('auth_web', user.id)
    await assertPassword(assert, 'ada@example.com', 'new-secret-password')
    assert.lengthOf(await PasswordResetToken.query().where('userId', user.id), 0)
    assert.lengthOf(await db.from('remember_me_tokens').where('tokenable_id', user.id), 0)

    const reuse = await client.get(`/reset-password/${token}`).withInertia()
    reuse.assertInertiaPropsContains({ valid: false })
  })

  test('AUTH-10 the new password must have 8 characters and be confirmed', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ email: 'ada@example.com' }).create()
    const token = await new PasswordResetService().createToken(user)

    const response = await resetPassword(client, token, 'short')

    const errors = response.flashMessages().inputErrorsBag as Record<string, string[]>
    assert.deepEqual(errors.password, ['Enter at least 8 characters'])
    await assertPassword(assert, 'ada@example.com', 'secret-password')
    assert.lengthOf(await PasswordResetToken.query().where('userId', user.id), 1)
  })
})
