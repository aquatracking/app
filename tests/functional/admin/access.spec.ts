import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { InvitationFactory } from '#database/factories/invitation_factory'

test.group('Administration access', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * Every route of the administration, with existing ids.
   */
  async function adminRoutes() {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const other = await UserFactory.create()
    const invitation = await InvitationFactory.merge({ invitedById: admin.id }).create()

    return {
      admin,
      other,
      invitation,
      routes: [
        ['GET', '/admin/users'],
        ['PUT', `/admin/users/${other.id}/admin`],
        ['DELETE', `/admin/users/${other.id}`],
        ['POST', `/admin/users/${other.id}/password-reset`],
        ['GET', '/admin/invitations'],
        ['POST', '/admin/invitations'],
        ['POST', `/admin/invitations/${invitation.id}/renew`],
        ['DELETE', `/admin/invitations/${invitation.id}`],
      ] as const,
    }
  }

  test('ADM-1 a non-admin user gets 403 on every /admin route, and nothing changes', async ({
    client,
    assert,
  }) => {
    const { other, invitation, routes } = await adminRoutes()
    const user = await UserFactory.create()

    for (const [method, url] of routes) {
      const response = await client
        .request(url, method)
        .withInertia()
        .form({ isAdmin: 'true', email: other.email })
        .withCsrfToken()
        .loginAs(user)
        .redirects(0)

      response.assertStatus(403)
      response.assertInertiaComponent('errors/forbidden')
    }

    await other.refresh()
    assert.isFalse(other.isAdmin)
    await invitation.refresh()
    assert.isFalse(invitation.$isDeleted)
  })

  test('ADM-1 a guest is sent to the login page', async ({ client }) => {
    const { routes } = await adminRoutes()

    for (const [method, url] of routes) {
      const response = await client.request(url, method).withCsrfToken().redirects(0)
      response.assertStatus(302)
      response.assertHeader('location', '/login')
    }
  })

  test('ADM-1 the "Administration" link is shared only with administrators', async ({ client }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.create()

    const asAdmin = await client.get('/admin/users').withInertia().loginAs(admin)
    asAdmin.assertStatus(200)
    asAdmin.assertInertiaPropsContains({ user: { id: admin.id, isAdmin: true } })

    const asUser = await client.get('/').withInertia().loginAs(user)
    asUser.assertInertiaPropsContains({ user: { id: user.id, isAdmin: false } })
  })
})
