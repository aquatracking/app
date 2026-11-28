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

/**
 * HTML of the page as rendered by the server (SSR), without the props
 * sent along (written before it).
 */
export function renderedPage(response: ApiResponse): string {
  const page = response.text().split('id="app"')[1].split('</body>')[0]
  return page.slice(page.indexOf('>') + 1)
}

/**
 * Text of a piece of HTML as read on screen: tags replaced by spaces,
 * spaces collapsed.
 */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
