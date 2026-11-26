import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('first_name').notNullable()
      table.text('last_name').nullable()
      table.text('email').notNullable().unique()
      table.text('password').notNullable()
      table.boolean('is_admin').notNullable().defaultTo(false)
      table.text('locale').notNullable().defaultTo('en')
      table.text('timezone').notNullable().defaultTo('UTC')
      table.uuid('invited_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('last_seen_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.check(`locale in ('fr', 'en')`, [], 'users_locale_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
