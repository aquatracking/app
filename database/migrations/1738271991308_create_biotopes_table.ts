import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'biotopes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').notNullable().primary()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.enum('type', ['aquarium', 'terrarium']).notNullable()
      table.integer('volume').nullable()
      table.date('started_date').notNullable()
      table.date('archived_date').nullable()

      table.uuid('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
