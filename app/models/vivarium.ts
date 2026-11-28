import { compose } from '@adonisjs/core/helpers'
import { hasMany } from '@adonisjs/lucid/orm'
import Measure from '#models/measure'
import TrackedMeasure from '#models/tracked_measure'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { VivariumSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'
import ArchivedVivariumException from '#exceptions/archived_vivarium_exception'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Kinds of vivarium, water types and climates (docs/CONTEXT.md), mirrored
 * by the CHECK constraints of the "vivariums" table.
 */
export const VIVARIUM_KINDS = ['aquarium', 'terrarium', 'paludarium'] as const
export type VivariumKind = (typeof VIVARIUM_KINDS)[number]

export const WATER_TYPES = ['fresh', 'brackish', 'salt'] as const
export type WaterType = (typeof WATER_TYPES)[number]

export const CLIMATES = ['tropical', 'desert', 'temperate'] as const
export type Climate = (typeof CLIMATES)[number]

/**
 * Whether a kind of vivarium has a water type and a climate: required when
 * it has, absent otherwise ("vivariums_profile_check").
 */
export function hasWaterType(kind: VivariumKind) {
  return kind !== 'terrarium'
}

export function hasClimate(kind: VivariumKind) {
  return kind !== 'aquarium'
}

/**
 * Profile of a vivarium (docs/CONTEXT.md): its kind, water type and
 * climate. Determines the default tracked measures.
 */
export interface VivariumProfile {
  kind: VivariumKind
  waterType: WaterType | null
  climate: Climate | null
}

export default class Vivarium extends compose(VivariumSchema, withUuidV7) {
  declare kind: VivariumKind
  declare waterType: WaterType | null
  declare climate: Climate | null

  @hasMany(() => TrackedMeasure)
  declare trackedMeasures: HasMany<typeof TrackedMeasure>

  @hasMany(() => Measure)
  declare measures: HasMany<typeof Measure>

  get profile(): VivariumProfile {
    return { kind: this.kind, waterType: this.waterType, climate: this.climate }
  }

  /**
   * An archived vivarium is read-only, except for unarchiving it.
   */
  get isArchived() {
    return this.archivedAt !== null
  }

  /**
   * Locks the row of the vivarium until the end of the transaction of a
   * change, then checks again that it is not archived. Archiving, which
   * writes the row, waits for these transactions; a change that waited
   * for an archiving is refused (docs/features/04-vivariums.md).
   *
   * In shared mode for a change of its content (readings, tracked
   * measures), which does not write the row; for writing when the change
   * writes it (form), so that two of them cannot deadlock.
   *
   * @throws ArchivedVivariumException when it was archived meanwhile
   */
  async lockUnarchived(trx: TransactionClientContract, mode: 'share' | 'update' = 'share') {
    const locked = await Vivarium.query({ client: trx })
      .where('id', this.id)
      .select('archived_at')
      .if(mode === 'share', (query) => query.forShare())
      .if(mode === 'update', (query) => query.forUpdate())
      .firstOrFail()
    if (locked.isArchived) {
      throw new ArchivedVivariumException()
    }
  }
}
