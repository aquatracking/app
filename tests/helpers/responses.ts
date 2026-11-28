import type { ApiResponse } from '@japa/api-client'
import type { GeneratedLink } from '#middleware/inertia_middleware'

/**
 * Validation errors of a field, as flashed for the next page.
 */
export function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}

/**
 * Link of an invitation or a password reset, flashed to be shown once to
 * the administrator.
 */
export function generatedLink(response: ApiResponse): GeneratedLink {
  return response.flashMessages().generatedLink as GeneratedLink
}
