import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.table(this.tableName, (table) => {
      table.boolean('is_admin').defaultTo(false)
    })
  }

  async down() {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('is_admin')
    })
  }
}
