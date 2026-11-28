import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type User from '#models/user'
import type Vivarium from '#models/vivarium'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import { UserFactory } from '#database/factories/user_factory'
import { measuresOf, readingUrl, storeMeasures, vivariumTracking } from '#tests/helpers/measures'

const READING = '2026-01-15T18:00:00Z'
const FORM = { measuredAt: '2026-01-15T18:00', values: { ph: '7.5' } }

/**
 * Every route of feature 06 on the reading of READING.
 */
function everyRoute(client: ApiClient, user: User, vivarium: Vivarium, measuredAt = READING) {
  const send = (request: ReturnType<ApiClient['get']>) =>
    request
      .withInertia()
      .header('referer', `/vivariums/${vivarium.id}/measures`)
      .withCsrfToken()
      .loginAs(user)
      .redirects(0)
  return {
    storeReading: () => send(client.post(`/vivariums/${vivarium.id}/readings`).json(FORM)),
    index: () => send(client.get(`/vivariums/${vivarium.id}/measures`)),
    editReading: () => send(client.get(`${readingUrl(vivarium, measuredAt)}/edit`)),
    updateReading: () => send(client.put(readingUrl(vivarium, measuredAt)).json(FORM)),
    destroyReading: () => send(client.delete(readingUrl(vivarium, measuredAt))),
  }
}

test.group('Readings access', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('MEA-6 creating, editing and deleting readings are refused on an archived vivarium', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, READING, { ph: 7 })
    vivarium.archivedAt = DateTime.now()
    await vivarium.save()
    const routes = everyRoute(client, user, vivarium)

    for (const action of [
      'storeReading',
      'editReading',
      'updateReading',
      'destroyReading',
    ] as const) {
      const response = await routes[action]()
      response.assertHeader('location', `/vivariums/${vivarium.id}/measures`)
      response.assertFlashMessage('notification', {
        type: 'error',
        message: 'This tank is archived: unarchive it to change it.',
      })
    }
    assert.deepEqual(await measuresOf(vivarium), [`${READING} ph=7`])

    /**
     * The history stays readable, the dashboard has no reading field.
     */
    const history = await routes.index()
    history.assertStatus(200)
    const dashboard = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    assert.deepEqual((dashboard.inertiaProps as { readingFields: unknown[] }).readingFields, [])
  })

  test('MEA-12 every route answers 404 for the vivarium of another user', async ({
    client,
    assert,
  }) => {
    const { vivarium } = await vivariumTracking(['ph'])
    await storeMeasures(vivarium, READING, { ph: 7 })
    const intruder = await UserFactory.create()
    const routes = everyRoute(client, intruder, vivarium)

    for (const action of Object.keys(routes) as (keyof typeof routes)[]) {
      const response = await routes[action]()
      assert.equal(response.status(), 404, action)
    }
    assert.deepEqual(await measuresOf(vivarium), [`${READING} ph=7`])
  })

  test('MEA-12 a reading that does not exist on the vivarium of the URL answers 404', async ({
    client,
    assert,
  }) => {
    const { user, vivarium } = await vivariumTracking(['ph'])
    const other = await vivariumTracking(['ph'], user)
    await storeMeasures(other.vivarium, READING, { ph: 7 })

    for (const measuredAt of [READING, '2026-01-15T18:00:30Z', '2026-13-45T18:00:00Z', 'now']) {
      const routes = everyRoute(client, user, vivarium, measuredAt)
      for (const action of ['editReading', 'updateReading', 'destroyReading'] as const) {
        const response = await routes[action]()
        assert.equal(response.status(), 404, `${action} ${measuredAt}`)
      }
    }
    assert.deepEqual(await measuresOf(other.vivarium), [`${READING} ph=7`])
  })

  test('MEA-20 no route changes or deletes one measure', async ({ assert }) => {
    const routes = router
      .toJSON()
      .root.filter((route) => route.pattern.startsWith('/vivariums/:id/'))
      .filter((route) => /\/(measures|readings)/.test(route.pattern))
      .map(
        (route) =>
          `${route.methods.filter((method) => method !== 'HEAD').join(',')} ${route.pattern}`
      )
      .sort()

    assert.deepEqual(routes, [
      'DELETE /vivariums/:id/readings/:measuredAt',
      'GET /vivariums/:id/measures',
      'GET /vivariums/:id/readings/:measuredAt/edit',
      'POST /vivariums/:id/readings',
      'PUT /vivariums/:id/readings/:measuredAt',
    ])
  })
})
