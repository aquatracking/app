import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Invitation from '#models/invitation'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import type { GeneratedLink } from '#middleware/inertia_middleware'
import InvitationNotification from '#mails/invitation_notification'
import { InvitationFactory } from '#database/factories/invitation_factory'
import { fieldErrors, generatedLink } from '#tests/helpers/responses'
import { useMail } from '#tests/helpers/mail'

function invite(client: ApiClient, admin: User, email: string) {
  return client
    .post('/admin/invitations')
    .withInertia()
    .header('referer', '/admin/invitations')
    .form({ email })
    .withCsrfToken()
    .loginAs(admin)
    .redirects(0)
}

/**
 * Path of a link shown to the administrator.
 */
function pathOf(link: GeneratedLink): string {
  return new URL(link.url).pathname
}

async function assertLinkValid(client: ApiClient, path: string, valid: boolean) {
  const response = await client.get(path).withInertia()
  response.assertInertiaComponent('auth/register')
  if (valid) {
    response.assertInertiaPropsContains({ invitation: { email: 'grace@example.com' } })
  } else {
    response.assertInertiaPropsContains({ invitation: null })
  }
}

test.group('Administration of invitations', (group) => {
  const configured = app.config.get<boolean>('app.mail.enabled')

  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => useMail(false))
  group.each.teardown(() => useMail(configured))
  group.each.teardown(() => mail.restore())

  test('ADM-2 inviting a free email creates the invitation and shows a link to sign up', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true, firstName: 'Ada' }).create()

    const response = await invite(client, admin, 'Grace@Example.com')

    response.assertHeader('location', '/admin/invitations')
    const link = generatedLink(response)
    assert.equal(link.kind, 'invitation')
    assert.equal(link.email, 'grace@example.com')
    assert.isFalse(link.emailed)
    assert.match(link.url, /^http:\/\/localhost:\d+\/invitations\/[\w-]+$/)

    const invitation = await Invitation.findByOrFail('email', 'grace@example.com')
    assert.equal(invitation.invitedById, admin.id)
    assert.closeTo(
      invitation.expiresAt.toMillis(),
      DateTime.now().plus({ days: 7 }).toMillis(),
      5000
    )

    const list = await client.get('/admin/invitations').withInertia().loginAs(admin)
    list.assertInertiaComponent('admin/invitations/index')
    list.assertInertiaPropsContains({
      invitations: [
        { email: 'grace@example.com', invitedByName: admin.displayName, expired: false },
      ],
    })

    /**
     * AUTH-5: the link opens the registration form and creates the account.
     */
    await assertLinkValid(client, pathOf(link), true)
    await client
      .post(pathOf(link))
      .withInertia()
      .form({
        firstName: 'Grace',
        password: 'secret-password',
        passwordConfirmation: 'secret-password',
        locale: 'en',
        timezone: 'UTC',
      })
      .withCsrfToken()
    const grace = await User.findByOrFail('email', 'grace@example.com')
    assert.equal(grace.invitedById, admin.id)
  })

  test('ADM-2 the list shows the status of expired invitations', async ({ client }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    await InvitationFactory.merge({ email: 'late@example.com' }).apply('expired').create()

    const response = await client.get('/admin/invitations').withInertia().loginAs(admin)

    response.assertInertiaPropsContains({
      invitations: [{ email: 'late@example.com', invitedByName: null, expired: true }],
    })
  })

  test('ADM-3 inviting the email of an existing user is refused', async ({ client, assert }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    await UserFactory.merge({ email: 'grace@example.com' }).create()

    const response = await invite(client, admin, 'GRACE@example.com')

    response.assertHeader('location', '/admin/invitations')
    assert.deepEqual(fieldErrors(response, 'email'), ['An account already uses this email'])
    assert.isUndefined(response.flashMessages().generatedLink)
    assert.lengthOf(await Invitation.all(), 0)
  })

  test('ADM-4 inviting an email already invited renews the invitation: the old link no longer works', async ({
    client,
    assert,
  }) => {
    const first = await UserFactory.merge({ isAdmin: true }).create()
    const second = await UserFactory.merge({ isAdmin: true }).create()
    const old = await InvitationFactory.merge({
      email: 'grace@example.com',
      invitedById: first.id,
    })
      .apply('expired')
      .create()
    const oldLink = generatedLink(await invite(client, first, 'grace@example.com'))

    const response = await invite(client, second, 'grace@example.com')

    const link = generatedLink(response)
    await assertLinkValid(client, pathOf(oldLink), false)
    await assertLinkValid(client, pathOf(link), true)
    const invitations = await Invitation.all()
    assert.lengthOf(invitations, 1)
    assert.equal(invitations[0].id, old.id)
    assert.equal(invitations[0].invitedById, second.id)
    assert.isAbove(invitations[0].expiresAt.toMillis(), DateTime.now().plus({ days: 6 }).toMillis())
  })

  test('ADM-4 renewing an invitation gives a new link, invalidates the old one and makes the renewing administrator its author', async ({
    client,
    assert,
  }) => {
    const first = await UserFactory.merge({ isAdmin: true }).create()
    const second = await UserFactory.merge({ isAdmin: true }).create()
    const oldLink = generatedLink(await invite(client, first, 'grace@example.com'))
    const invitation = await Invitation.findByOrFail('email', 'grace@example.com')
    assert.equal(invitation.invitedById, first.id)
    await invitation.merge({ expiresAt: DateTime.now().minus({ days: 1 }) }).save()

    const response = await client
      .post(`/admin/invitations/${invitation.id}/renew`)
      .withInertia()
      .withCsrfToken()
      .loginAs(second)
      .redirects(0)

    response.assertHeader('location', '/admin/invitations')
    const link = generatedLink(response)
    assert.equal(link.kind, 'invitation')
    assert.notEqual(link.url, oldLink.url)
    await assertLinkValid(client, pathOf(oldLink), false)
    await assertLinkValid(client, pathOf(link), true)
    await invitation.refresh()
    assert.equal(invitation.invitedById, second.id)
    assert.closeTo(
      invitation.expiresAt.toMillis(),
      DateTime.now().plus({ days: 7 }).toMillis(),
      5000
    )
  })

  test('ADM-5 with SMTP, an invitation is emailed to the invited address in the language of the administrator', async ({
    client,
    assert,
  }) => {
    useMail(true)
    const { mails } = mail.fake()
    const admin = await UserFactory.merge({
      isAdmin: true,
      firstName: 'Ada',
      locale: 'fr',
    }).create()

    const response = await invite(client, admin, 'grace@example.com')

    const link = generatedLink(response)
    assert.isTrue(link.emailed)
    mails.assertQueuedCount(InvitationNotification, 1)
    mails.assertQueued(InvitationNotification, ({ message }) => {
      message.assertTo('grace@example.com')
      message.assertSubject('Ada vous invite sur AquaTracking')
      message.assertTextIncludes(link.url)
      message.assertHtmlIncludes('Ce lien est valable 7 jours')
      return true
    })
  })

  test('ADM-5 the text part of the invitation email is plain text, without HTML entities', async ({
    client,
    assert,
  }) => {
    useMail(true)
    const { mails } = mail.fake()
    const admin = await UserFactory.merge({
      isAdmin: true,
      firstName: "D'Arcy & Co",
      locale: 'fr',
    }).create()

    await invite(client, admin, 'grace@example.com')

    const [sent] = mails.queued()
    const text = sent.message.toJSON().message.text as string
    assert.include(text, "D'Arcy & Co vous invite")
    assert.include(text, "ne peut servir qu'une fois")
    assert.notMatch(text, /&#?\w+;/)
  })

  test('ADM-5 without SMTP, no email is sent', async ({ client, assert }) => {
    const { mails } = mail.fake()
    const admin = await UserFactory.merge({ isAdmin: true }).create()

    const response = await invite(client, admin, 'grace@example.com')

    assert.isFalse(generatedLink(response).emailed)
    mails.assertNoneQueued()
    mails.assertNoneSent()
  })

  test('ADM-6 revoking an invitation makes its link invalid', async ({ client, assert }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const link = generatedLink(await invite(client, admin, 'grace@example.com'))
    const invitation = await Invitation.findByOrFail('email', 'grace@example.com')

    const response = await client
      .delete(`/admin/invitations/${invitation.id}`)
      .withInertia()
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertHeader('location', '/admin/invitations')
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'The invitation of grace@example.com has been revoked.',
    })
    assert.isNull(await Invitation.find(invitation.id))
    await assertLinkValid(client, pathOf(link), false)
  })

  test('ADM-6 an unknown invitation answers 404', async ({ client }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()

    const response = await client
      .delete('/admin/invitations/0190a000-0000-7000-8000-000000000000')
      .withInertia()
      .withCsrfToken()
      .loginAs(admin)

    response.assertStatus(404)
  })
})
