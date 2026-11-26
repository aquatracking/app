import { test } from '@japa/runner'

test.group('Health checks', () => {
  test('liveness answers 200 without a redirection', async ({ client }) => {
    const response = await client.get('/health/live').redirects(0)

    response.assertStatus(200)
    response.assertBody({ status: 'ok' })
  })

  test('there is no public readiness report', async ({ client }) => {
    const response = await client.get('/health/ready')

    response.assertStatus(404)
  })
})
