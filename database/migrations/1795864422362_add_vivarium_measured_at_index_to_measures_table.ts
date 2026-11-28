import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'measures'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * Reads of all the measures of a vivarium by date, whatever their
       * type: the unfiltered history, the last and the oldest reading
       * (docs/data-model.md). The unique index starts with the type.
       */
      table.index(['vivarium_id', 'measured_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['vivarium_id', 'measured_at'])
    })
  }
}
