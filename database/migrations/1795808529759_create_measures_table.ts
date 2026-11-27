import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'measures'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('vivarium_id')
        .notNullable()
        .references('id')
        .inTable('vivariums')
        .onDelete('CASCADE')
      table
        .uuid('measure_type_id')
        .notNullable()
        .references('id')
        .inTable('measure_types')
        .onDelete('RESTRICT')
      table.decimal('value', 10, 3).notNullable()
      table.timestamp('measured_at', { useTz: true }).notNullable()
      table.text('source').notNullable().defaultTo('manual')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.check(`source in ('manual', 'device')`, [], 'measures_source_check')

      /**
       * No two measures of a type at the same instant on a vivarium: a
       * reading is stable and without duplicates (ADR 0006). Also serves
       * the last values, the filtered history and the charts.
       */
      table.unique(['vivarium_id', 'measure_type_id', 'measured_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
