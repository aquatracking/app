import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'measures'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').notNullable().primary()
      table.float('value').notNullable()
      table.string('measure_type_code').notNullable()
      table.dateTime('measured_at').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.uuid('biotope_id').notNullable().references('biotopes.id').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
