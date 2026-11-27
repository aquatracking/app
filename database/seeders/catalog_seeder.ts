import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { MeasureTypeCatalogService } from '#services/measure_type_catalog_service'

/**
 * Synchronizes the measure_types table with app/catalog/measure_types.ts
 * (ADR 0005). Idempotent: runs on every start, after the migrations.
 */
export default class extends BaseSeeder {
  async run() {
    const service = await app.container.make(MeasureTypeCatalogService)
    await service.synchronize()
  }
}
