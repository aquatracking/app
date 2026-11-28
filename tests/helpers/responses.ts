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
  const [, app] = response.text().split('id="app"')
  if (app === undefined) {
    throw new Error(
      `No element "#app" in the response (status ${response.status()}): not an Inertia page rendered by the server`
    )
  }
  const page = app.split('</body>')[0]
  return page.slice(page.indexOf('>') + 1)
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

/**
 * Text of a piece of HTML as read on screen: tags replaced by spaces,
 * the usual named entities and the numeric ones decoded, spaces
 * collapsed. Another named entity is left as written.
 */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, name: string) => {
      if (name.startsWith('#')) {
        const code =
          name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
        return String.fromCodePoint(code)
      }
      return NAMED_ENTITIES[name.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Values of the options marked `selected` in a select of the page as
 * rendered by the server (SSR): what the browser shows before the
 * scripts run.
 */
export function selectedOptions(response: ApiResponse, selectId: string): string[] {
  const select = renderedPage(response).match(
    new RegExp(`<select[^>]*\\sid="${selectId}"[^>]*>([\\s\\S]*?)</select>`)
  )
  if (!select) {
    throw new Error(`No select "${selectId}" in the page rendered by the server`)
  }
  return [...select[1].matchAll(/<option([^>]*)>/g)]
    .filter(([, attributes]) => /\sselected(?=[\s=>]|$)/.test(attributes))
    .map(([, attributes]) => attributes.match(/\svalue="([^"]*)"/)?.[1] ?? '')
}
