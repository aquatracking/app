import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Reference data written only by the catalog seeder (ADR 0005). Labels
 * come from the translations, bounds and default profiles stay in
 * app/catalog/measure_types.ts.
 */
export default class extends BaseSchema {
  protected tableName = 'measure_types'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('code').notNullable().unique()
      table.text('unit').notNullable()
      table.smallint('decimals').notNullable()
      table.smallint('position').notNullable()

      table.check(`decimals between 0 and 3`, [], 'measure_types_decimals_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
