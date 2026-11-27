import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracked_measures'

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
      table.smallint('position').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      /**
       * A type is tracked once per vivarium. Also serves the lookups by
       * vivarium.
       */
      table.unique(['vivarium_id', 'measure_type_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
