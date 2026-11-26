import type { HttpContext } from '@adonisjs/core/http'

/**
 * Liveness probe for Docker and orchestrators. There is no public
 * readiness report: it would expose server details (docs/architecture.md).
 */
export default class HealthChecksController {
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }
}
