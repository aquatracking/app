import { compose } from '@adonisjs/core/helpers'
import { VivariumSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'

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

export default class Vivarium extends compose(VivariumSchema, withUuidV7) {
  declare kind: VivariumKind
  declare waterType: WaterType | null
  declare climate: Climate | null

  /**
   * An archived vivarium is read-only, except for unarchiving it.
   */
  get isArchived() {
    return this.archivedAt !== null
  }
}
