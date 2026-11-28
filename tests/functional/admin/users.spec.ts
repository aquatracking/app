import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Invitation from '#models/invitation'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import PasswordResetToken from '#models/password_reset_token'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { PasswordResetService } from '#services/password_reset_service'
import { InvitationFactory } from '#database/factories/invitation_factory'
import PasswordResetNotification from '#mails/password_reset_notification'
import { UserAdministrationService } from '#services/user_administration_service'
import LastAdminException from '#exceptions/last_admin_exception'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import { generatedLink } from '#tests/helpers/responses'
import { useMail } from '#tests/helpers/mail'

function setAdmin(client: ApiClient, actor: User, target: User, isAdmin: boolean) {
  return client
    .put(`/admin/users/${target.id}/admin`)
    .withInertia()
    .header('referer', '/admin/users')
    .form({ isAdmin: String(isAdmin) })
    .withCsrfToken()
    .loginAs(actor)
    .redirects(0)
}

function deleteUser(client: ApiClient, actor: User, target: User, email = target.email) {
  return client
    .delete(`/admin/users/${target.id}`)
    .withInertia()
    .header('referer', '/admin/users')
    .form({ email })
    .withCsrfToken()
    .loginAs(actor)
    .redirects(0)
}

function createPasswordReset(client: ApiClient, actor: User, target: User) {
  return client
    .post(`/admin/users/${target.id}/password-reset`)
    .withInertia()
    .withCsrfToken()
    .loginAs(actor)
    .redirects(0)
}

async function listUsers(client: ApiClient, admin: User) {
  const response = await client.get('/admin/users').withInertia().loginAs(admin)
  response.assertInertiaComponent('admin/users/index')
  return response
}

test.group('Administration of users', (group) => {
  const configured = app.config.get<boolean>('app.mail.enabled')

  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => useMail(false))
  group.each.teardown(() => useMail(configured))
  group.each.teardown(() => mail.restore())

  test('ADM-7 naming an administrator and removing the rights of another one', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.merge({ firstName: 'Grace', lastName: 'Hopper' }).create()

    const granted = await setAdmin(client, admin, user, true)
    granted.assertHeader('location', '/admin/users')
    granted.assertFlashMessage('notification', {
      type: 'success',
      message: 'Grace Hopper is now an administrator.',
    })
    await user.refresh()
    assert.isTrue(user.isAdmin)

    await setAdmin(client, admin, user, false)
    await user.refresh()
    assert.isFalse(user.isAdmin)
  })

  test("ADM-7 removing one's own rights is refused", async ({ client, assert }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    await UserFactory.merge({ isAdmin: true }).create()

    const response = await setAdmin(client, admin, admin, false)

    response.assertHeader('location', '/admin/users')
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'You cannot remove your own administrator rights.',
    })
    await admin.refresh()
    assert.isTrue(admin.isAdmin)
  })

  test('ADM-7 removing the rights of the last administrator is refused', async ({ assert }) => {
    /**
     * Over HTTP, the last administrator can only be the actor, refused as
     * such. The service refuses it on its own, e.g. for an actor whose
     * rights were removed meanwhile by another administrator.
     */
    const actor = await UserFactory.merge({ isAdmin: true }).create()
    const lastAdmin = await UserFactory.merge({ isAdmin: true }).create()
    await db.from('users').where('id', actor.id).update({ is_admin: false })

    const userAdministrationService = await app.container.make(UserAdministrationService)
    await assert.rejects(
      () => userAdministrationService.setAdmin(actor, lastAdmin, false),
      LastAdminException
    )
    await lastAdmin.refresh()
    assert.isTrue(lastAdmin.isAdmin)
  })

  test('ADM-7 the last administrator message is translated', async ({ client, assert }) => {
    const admin = await UserFactory.merge({ isAdmin: true, locale: 'fr' }).create()

    const response = await setAdmin(client, admin, admin, false)

    response.assertFlashMessage('notification', {
      type: 'error',
      message: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
    })
    await admin.refresh()
    assert.isTrue(admin.isAdmin)
  })

  test('ADM-8 deleting a user deletes the account and what belongs to it', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.merge({ email: 'grace@example.com', isAdmin: true }).create()
    await User.rememberMeTokens.create(user, '1 year')
    await new PasswordResetService().createToken(user)

    const response = await deleteUser(client, admin, user, ' Grace@Example.com ')

    response.assertHeader('location', '/admin/users')
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'The account grace@example.com has been deleted.',
    })
    assert.isNull(await User.find(user.id))
    assert.lengthOf(await db.from('remember_me_tokens').where('tokenable_id', user.id), 0)
    assert.lengthOf(await PasswordResetToken.query().where('userId', user.id), 0)
  })

  test('ADM-8 the deletion must be confirmed with the email of the account', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.merge({ email: 'grace@example.com' }).create()

    for (const email of ['', admin.email, 'grace@example.org']) {
      const response = await deleteUser(client, admin, user, email)
      response.assertHeader('location', '/admin/users')
      const errors = response.flashMessages().inputErrorsBag as Record<string, string[]>
      assert.isNotEmpty(errors.email)
    }
    assert.isNotNull(await User.find(user.id))
  })

  test('ADM-8 the invitations sent by a deleted administrator stay, without inviter', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const inviter = await UserFactory.merge({ isAdmin: true }).create()
    const invitation = await InvitationFactory.merge({ invitedById: inviter.id }).create()

    await deleteUser(client, admin, inviter)

    await invitation.refresh()
    assert.isNull(invitation.invitedById)
    assert.lengthOf(await Invitation.all(), 1)
  })

  test("ADM-9 deleting one's own account from the administration is refused", async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()

    const response = await deleteUser(client, admin, admin)

    response.assertHeader('location', '/admin/users')
    response.assertFlashMessage('notification', {
      type: 'error',
      message: 'You cannot delete your own account from the administration.',
    })
    assert.isNotNull(await User.find(admin.id))
  })

  test('ADM-14 an administrator deleted or deprived of their rights in the meantime cannot delete an account', async ({
    assert,
  }) => {
    const demoted = await UserFactory.merge({ isAdmin: true }).create()
    const deleted = await UserFactory.merge({ isAdmin: true }).create()
    const target = await UserFactory.merge({ isAdmin: true }).create()
    /**
     * The actors were loaded as administrators by the request, before
     * the change.
     */
    await User.query().where('id', demoted.id).update({ is_admin: false })
    await User.query().where('id', deleted.id).delete()
    const service = await app.container.make(UserAdministrationService)

    for (const actor of [demoted, deleted]) {
      await assert.rejects(
        () => service.delete(actor, target),
        bouncerErrors.E_AUTHORIZATION_FAILURE
      )
    }
    assert.isNotNull(await User.find(target.id))
  })

  test('ADM-10 a generated reset link works once and invalidates the previous ones', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.merge({ email: 'grace@example.com' }).create()
    const previous = await new PasswordResetService().createToken(user)

    const response = await createPasswordReset(client, admin, user)

    response.assertHeader('location', '/admin/users')
    const link = generatedLink(response)
    assert.equal(link.kind, 'password_reset')
    assert.equal(link.email, 'grace@example.com')
    assert.isFalse(link.emailed)
    assert.match(link.url, /^http:\/\/localhost:\d+\/reset-password\/[\w-]+$/)
    const path = new URL(link.url).pathname

    const old = await client.get(`/reset-password/${previous}`).withInertia()
    old.assertInertiaPropsContains({ valid: false })
    const show = await client.get(path).withInertia()
    show.assertInertiaPropsContains({ valid: true })

    /**
     * AUTH-10: the link changes the password once.
     */
    const reset = await client
      .post(path)
      .withInertia()
      .form({ password: 'new-secret-password', passwordConfirmation: 'new-secret-password' })
      .withCsrfToken()
      .redirects(0)
    reset.assertHeader('location', '/')
    await User.verifyCredentials('grace@example.com', 'new-secret-password')
    const reuse = await client.get(path).withInertia()
    reuse.assertInertiaPropsContains({ valid: false })
    const token = await PasswordResetToken.query().where('userId', user.id).first()
    assert.isNull(token)
  })

  test('ADM-10 a generated reset link is valid 1 hour', async ({ client, assert }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.create()

    await createPasswordReset(client, admin, user)

    const token = await PasswordResetToken.findByOrFail('userId', user.id)
    assert.closeTo(token.expiresAt.toMillis(), DateTime.now().plus({ hours: 1 }).toMillis(), 5000)
  })

  test('ADM-10 with SMTP, the generated link is also emailed to the user; without, it is not', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.merge({ email: 'grace@example.com', locale: 'fr' }).create()

    const withoutSmtp = await createPasswordReset(client, admin, user)
    assert.isFalse(generatedLink(withoutSmtp).emailed)
    mails.assertNoneQueued()

    useMail(true)
    const withSmtp = await createPasswordReset(client, admin, user)

    const link = generatedLink(withSmtp)
    assert.isTrue(link.emailed)
    mails.assertQueuedCount(PasswordResetNotification, 1)
    mails.assertQueued(PasswordResetNotification, ({ message }) => {
      message.assertTo('grace@example.com')
      message.assertSubject('Choisissez un nouveau mot de passe')
      message.assertTextIncludes(link.url)
      return true
    })
  })

  test('ADM-11 the users page exposes only the account columns and the number of vivariums', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const owner = await UserFactory.create()
    await VivariumFactory.merge({
      userId: owner.id,
      name: 'Secret reef',
      description: 'Hidden corals',
    }).create()

    const response = await listUsers(client, admin)

    const { users } = response.inertiaProps as { users: Record<string, unknown>[] }
    assert.lengthOf(users, 2)
    for (const user of users) {
      assert.sameMembers(Object.keys(user), [
        'id',
        'displayName',
        'email',
        'isAdmin',
        'invitedByName',
        'createdAt',
        'lastSeenAt',
        'vivariumsCount',
      ])
    }
    const props = JSON.stringify(response.inertiaProps)
    assert.notInclude(props, 'Secret reef')
    assert.notInclude(props, 'Hidden corals')
  })

  test('ADM-12 a user shows the name of their inviter, and "—" once the inviter is deleted', async ({
    client,
    assert,
  }) => {
    const first = await UserFactory.merge({
      isAdmin: true,
      firstName: 'Ada',
      lastName: null,
    }).create()
    const inviter = await UserFactory.merge({
      isAdmin: true,
      firstName: 'Grace',
      lastName: 'Hopper',
    }).create()
    const invited = await UserFactory.merge({ invitedById: inviter.id }).create()
    const lastSeen = DateTime.now().minus({ days: 3 })
    await db.from('users').where('id', invited.id).update({ last_seen_at: lastSeen.toSQL() })

    const before = await listUsers(client, first)
    before.assertInertiaPropsContains({
      users: [
        { id: first.id, displayName: 'Ada', invitedByName: null },
        { id: inviter.id, displayName: 'Grace Hopper', invitedByName: null },
        {
          id: invited.id,
          invitedByName: 'Grace Hopper',
          createdAt: invited.createdAt.toUTC().toISO(),
          lastSeenAt: lastSeen.toUTC().toISO(),
        },
      ],
    })

    await deleteUser(client, first, inviter)

    await invited.refresh()
    assert.isNull(invited.invitedById)
    const after = await listUsers(client, first)
    after.assertInertiaPropsContains({
      users: [
        { id: first.id, invitedByName: null },
        { id: invited.id, invitedByName: null },
      ],
    })
  })
})
