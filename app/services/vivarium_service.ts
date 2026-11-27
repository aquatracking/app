import type User from '#models/user'
import { inject } from '@adonisjs/core'
import Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type { createVivariumValidator } from '#validators/vivarium'
import { TrackedMeasureService } from '#services/tracked_measure_service'

/**
 * Operations on vivariums callable outside HTTP
 * (docs/features/04-vivariums.md). The caller authorizes with
 * VivariumPolicy.
 */
@inject()
export class VivariumService {
  constructor(protected trackedMeasureService: TrackedMeasureService) {}

  /**
   * Creates a vivarium of the user with the default tracked measures of
   * its profile, in one transaction (docs/features/05-tracked-measures.md).
   */
  async create(user: User, data: Infer<typeof createVivariumValidator>) {
    return db.transaction(async (trx) => {
      const vivarium = await Vivarium.create({ ...data, userId: user.id }, { client: trx })
      await this.trackedMeasureService.createDefaults(vivarium, trx)
      return vivarium
    })
  }
}
