import type User from '#models/user'
import type { ApiClient } from '@japa/api-client'

/**
 * Submits the form that creates a vivarium, as given.
 */
export function createVivarium(client: ApiClient, user: User, form: Record<string, string>) {
  return client
    .post('/vivariums')
    .withInertia()
    .header('referer', '/vivariums/create')
    .form(form)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}
