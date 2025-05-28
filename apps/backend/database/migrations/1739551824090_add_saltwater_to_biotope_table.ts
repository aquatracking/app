import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('biotopes', (table) => {
      table.boolean('saltwater').defaultTo('false')
    })
  }

  async down() {
    this.schema.alterTable('biotopes', (table) => {
      table.dropColumn('saltwater')
    })
  }
}
