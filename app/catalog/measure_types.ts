import type { VivariumKind, VivariumProfile, WaterType } from '#models/vivarium'

/**
 * An entry of the catalog of measure types (ADR 0005,
 * docs/features/05-tracked-measures.md). Its label and description are
 * the translations "measure_types.<code>.label" and ".description".
 */
export interface MeasureTypeDefinition {
  /**
   * Stable: key of the translations and of the "measure_types" row.
   */
  code: string
  /**
   * Empty for a value without unit (pH, specific gravity).
   */
  unit: string
  /**
   * Maximum precision accepted on entry and shown, not a forced format:
   * values are stored as entered and shown without trailing zeros.
   */
  decimals: number
  /**
   * Bounds of plausibility: a value outside them is an entry error.
   */
  min: number
  max: number
  /**
   * Profiles that track the type by default: vivariums of these kinds,
   * whatever their water type and climate, and vivariums with one of
   * these water types (aquariums, aquatic part of paludariums).
   */
  defaultFor: { kinds?: VivariumKind[]; waterTypes?: WaterType[] }
  /**
   * A type that is no longer offered. An entry is never removed: a
   * retired one keeps its rules for the vivariums and measures that use it.
   */
  retired?: boolean
}

const ALL_WATER_TYPES: WaterType[] = ['fresh', 'brackish', 'salt']

/**
 * The catalog, in display order.
 */
export const MEASURE_TYPES: readonly MeasureTypeDefinition[] = [
  {
    code: 'temperature',
    unit: '°C',
    decimals: 1,
    min: -10,
    max: 60,
    defaultFor: { kinds: ['aquarium', 'terrarium', 'paludarium'] },
  },
  {
    code: 'ph',
    unit: '',
    decimals: 2,
    min: 0,
    max: 14,
    defaultFor: { waterTypes: ALL_WATER_TYPES },
  },
  { code: 'gh', unit: '°dGH', decimals: 0, min: 0, max: 50, defaultFor: { waterTypes: ['fresh'] } },
  {
    code: 'kh',
    unit: '°dKH',
    decimals: 1,
    min: 0,
    max: 50,
    defaultFor: { waterTypes: ALL_WATER_TYPES },
  },
  {
    code: 'no2',
    unit: 'mg/L',
    decimals: 3,
    min: 0,
    max: 50,
    defaultFor: { waterTypes: ['fresh', 'brackish'] },
  },
  {
    code: 'no3',
    unit: 'mg/L',
    decimals: 1,
    min: 0,
    max: 500,
    defaultFor: { waterTypes: ALL_WATER_TYPES },
  },
  { code: 'nh3', unit: 'mg/L', decimals: 2, min: 0, max: 50, defaultFor: {} },
  { code: 'po4', unit: 'mg/L', decimals: 3, min: 0, max: 50, defaultFor: { waterTypes: ['salt'] } },
  {
    code: 'salinity',
    unit: 'ppt',
    decimals: 1,
    min: 0,
    max: 50,
    defaultFor: { waterTypes: ['brackish', 'salt'] },
  },
  { code: 'specific_gravity', unit: '', decimals: 3, min: 1, max: 1.04, defaultFor: {} },
  {
    code: 'ca',
    unit: 'mg/L',
    decimals: 0,
    min: 0,
    max: 1000,
    defaultFor: { waterTypes: ['salt'] },
  },
  {
    code: 'mg',
    unit: 'mg/L',
    decimals: 0,
    min: 0,
    max: 3000,
    defaultFor: { waterTypes: ['salt'] },
  },
  { code: 'co2', unit: 'mg/L', decimals: 0, min: 0, max: 200, defaultFor: {} },
  { code: 'fe', unit: 'mg/L', decimals: 2, min: 0, max: 10, defaultFor: {} },
  { code: 'conductivity', unit: 'µS/cm', decimals: 0, min: 0, max: 100000, defaultFor: {} },
  {
    code: 'humidity',
    unit: '%',
    decimals: 0,
    min: 0,
    max: 100,
    defaultFor: { kinds: ['terrarium', 'paludarium'] },
  },
  { code: 'illuminance', unit: 'lux', decimals: 0, min: 0, max: 200000, defaultFor: {} },
]

/**
 * Access to the catalog, resolved from the container so that tests can
 * swap it for another list of entries.
 */
export class MeasureTypeCatalog {
  constructor(readonly entries: readonly MeasureTypeDefinition[] = MEASURE_TYPES) {}

  find(code: string) {
    return this.entries.find((entry) => entry.code === code)
  }

  /**
   * Entries that can still be added to a vivarium.
   */
  offered() {
    return this.entries.filter((entry) => !entry.retired)
  }

  /**
   * Entries tracked by default by a profile, in catalog order.
   */
  defaultsFor(profile: VivariumProfile) {
    return this.offered().filter(({ defaultFor }) => {
      if (defaultFor.kinds?.includes(profile.kind)) {
        return true
      }
      return profile.waterType !== null && !!defaultFor.waterTypes?.includes(profile.waterType)
    })
  }
}
