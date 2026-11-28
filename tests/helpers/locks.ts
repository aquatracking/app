import db from '@adonisjs/lucid/services/db'

/**
 * Waits until the given number of connections of the database wait for a
 * lock, on a table or on rows. Tests of concurrency hold a lock in a
 * transaction of their own, start the requests, then release it once they
 * all wait, so that they overlap (docs/architecture.md, tests).
 */
export async function waitForLockWaiters(count: number) {
  /**
   * Checked every 20 ms for 10 seconds at most: the requests usually wait
   * within a few checks, a loaded machine can take longer.
   */
  for (let attempt = 0; attempt < 500; attempt++) {
    const { rows } = await db.rawQuery(
      `select count(*)::int as waiting from pg_stat_activity
        where datname = current_database() and wait_event_type = 'Lock'`
    )
    if (rows[0].waiting >= count) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Expected ${count} connections waiting for a lock`)
}
