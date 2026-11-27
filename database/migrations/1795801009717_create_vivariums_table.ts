import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vivariums'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()
      table.text('kind').notNullable()
      table.text('name').notNullable()
      table.text('description').nullable()
      table.text('water_type').nullable()
      table.text('climate').nullable()
      table.integer('length_cm').nullable()
      table.integer('width_cm').nullable()
      table.integer('height_cm').nullable()
      table.decimal('volume_liters', 7, 1).nullable()
      table.date('started_on').notNullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.text('image_path').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.check(`kind in ('aquarium', 'terrarium', 'paludarium')`, [], 'vivariums_kind_check')
      table.check(`water_type in ('fresh', 'brackish', 'salt')`, [], 'vivariums_water_type_check')
      table.check(`climate in ('tropical', 'desert', 'temperate')`, [], 'vivariums_climate_check')
      table.check(
        `(kind = 'aquarium' and water_type is not null and climate is null)
          or (kind = 'terrarium' and water_type is null and climate is not null)
          or (kind = 'paludarium' and water_type is not null and climate is not null)`,
        [],
        'vivariums_profile_check'
      )
      table.check(
        `length_cm between 1 and 1000 and width_cm between 1 and 1000 and height_cm between 1 and 1000`,
        [],
        'vivariums_dimensions_check'
      )
      table.check(`volume_liters > 0`, [], 'vivariums_volume_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
