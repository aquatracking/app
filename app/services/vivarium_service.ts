import { DateTime } from 'luxon'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import { ReadingService } from '#services/reading_service'
import type { createVivariumValidator } from '#validators/vivarium'
import { TrackedMeasureService } from '#services/tracked_measure_service'

/**
 * Operations on vivariums callable outside HTTP
 * (docs/features/04-vivariums.md). The caller authorizes with
 * VivariumPolicy.
 */
@inject()
export class VivariumService {
  constructor(
    protected trackedMeasureService: TrackedMeasureService,
    protected readingService: ReadingService
  ) {}

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

  /**
   * Instant of the oldest reading of the vivarium in the given time zone,
   * null without any: its local date is the latest set-up date allowed
   * (docs/features/06-measures.md).
   */
  async firstReadingIn(vivarium: Vivarium, timezone: string) {
    const firstMeasuredAt = await this.readingService.firstMeasuredAt(vivarium)
    return firstMeasuredAt && firstMeasuredAt.setZone(timezone)
  }

  /**
   * Archives the vivarium: it leaves the home page and becomes read-only.
   */
  async archive(vivarium: Vivarium) {
    vivarium.archivedAt = DateTime.now()
    await vivarium.save()
  }

  /**
   * Puts an archived vivarium back in service.
   */
  async unarchive(vivarium: Vivarium) {
    vivarium.archivedAt = null
    await vivarium.save()
  }
}
