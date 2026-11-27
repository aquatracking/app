import type User from '#models/user'
import Vivarium from '#models/vivarium'
import type { Infer } from '@vinejs/vine/types'
import type { createVivariumValidator } from '#validators/vivarium'

/**
 * Operations on vivariums callable outside HTTP
 * (docs/features/04-vivariums.md). The caller authorizes with
 * VivariumPolicy.
 */
export class VivariumService {
  /**
   * Creates a vivarium of the user. Feature 05 adds here, in the same
   * transaction, the default tracked measures of its profile.
   */
  async create(user: User, data: Infer<typeof createVivariumValidator>) {
    return Vivarium.create({ ...data, userId: user.id })
  }
}
