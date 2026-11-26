import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Synchronizes the measure_types table with app/catalog/measure_types.ts
 * (ADR 0005). Idempotent: runs on every start, after the migrations.
 * Empty until feature 05 introduces the catalog.
 */
export default class extends BaseSeeder {
  async run() {}
}
