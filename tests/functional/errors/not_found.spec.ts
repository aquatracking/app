import { test } from '@japa/runner'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Session, auth and locale detection are server middleware (start/kernel.ts)
 * precisely so that the 404 page of an unknown URL knows the user and their
 * language. These tests fail if they move back to router middleware.
 */
test.group('Not found page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('follows the browser language for a guest', async ({ client }) => {
    const response = await client.get('/unknown-page').header('accept-language', 'fr').withInertia()

    response.assertStatus(404)
    response.assertInertiaComponent('errors/not_found')
    response.assertInertiaPropsContains({ locale: 'fr' })
  })

  test('uses the language of the signed-in user', async ({ client }) => {
    const user = await User.create({
      firstName: 'Ada',
      email: 'ada@example.com',
      password: 'secret-password',
      locale: 'fr',
    })

    const response = await client
      .get('/unknown-page')
      .header('accept-language', 'en')
      .withInertia()
      .loginAs(user)

    response.assertStatus(404)
    response.assertInertiaComponent('errors/not_found')
    response.assertInertiaPropsContains({ locale: 'fr', user: { id: user.id } })
  })
})
