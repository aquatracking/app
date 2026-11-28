/**
 * Unique violation of PostgreSQL ("23505"): a row inserted concurrently
 * with the same values of a unique index, which a check made beforehand
 * could not see.
 */
const UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null)?.code === UNIQUE_VIOLATION
}
