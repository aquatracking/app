import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Standard table of the @adonisjs/auth remember me tokens, with a uuid
 * "tokenable_id" to match "users.id".
 */
export default class extends BaseSchema {
  protected tableName = 'remember_me_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments()
      table.uuid('tokenable_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('hash').notNullable().unique()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
