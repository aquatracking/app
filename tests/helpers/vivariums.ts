import type User from '#models/user'
import type Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import { waitForLockWaiters } from '#tests/helpers/locks'

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

/**
 * Sends a request while the vivarium is being archived: the archiving
 * is not committed when the request is authorized, then is committed
 * once the request waits for the lock on the vivarium. Only in a test
 * group that empties the database by truncation (docs/architecture.md).
 */
export async function sendDuringArchiving(
  vivarium: Vivarium,
  send: () => PromiseLike<ApiResponse>
) {
  const archiving = await db.transaction()
  try {
    await archiving.rawQuery('update vivariums set archived_at = now() where id = ?', [vivarium.id])
    /**
     * A request is sent when awaited: Promise.resolve sends it now.
     */
    const response = Promise.resolve(send())
    await waitForLockWaiters(1)
    await archiving.commit()
    return await response
  } finally {
    if (!archiving.isCompleted) {
      await archiving.rollback()
    }
  }
}
