import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import MeasureType from '#models/measure_type'
import { Exception } from '@adonisjs/core/exceptions'
import { MeasureTypeCatalog } from '#catalog/measure_types'

/**
 * Keeps the "measure_types" table in sync with the catalog (ADR 0005,
 * docs/features/05-tracked-measures.md). Run by the catalog seeder on
 * every start.
 */
@inject()
export class MeasureTypeCatalogService {
  constructor(protected catalog: MeasureTypeCatalog) {}

  /**
   * Inserts the missing codes and updates the unit, decimals and position
   * of the others. Idempotent. Fails, without changing anything, when a
   * code of the table is no longer in the catalog: an entry is never
   * removed, it is marked retired.
   */
  async synchronize() {
    const entries = this.catalog.entries
    await db.transaction(async (trx) => {
      const codes = new Set(entries.map((entry) => entry.code))
      const stored = await MeasureType.query({ client: trx }).select('code')
      const missing = stored.map(({ code }) => code).filter((code) => !codes.has(code))
      if (missing.length > 0) {
        throw new Exception(
          `Measure types ${missing.join(', ')} are in the database but missing from app/catalog/measure_types.ts. ` +
            'An entry must never be removed from the catalog: restore it and mark it "retired".',
          { code: 'E_MEASURE_TYPE_NOT_IN_CATALOG' }
        )
      }

      await MeasureType.updateOrCreateMany(
        'code',
        entries.map(({ code, unit, decimals }, position) => ({ code, unit, decimals, position })),
        { client: trx }
      )
    })
  }
}
