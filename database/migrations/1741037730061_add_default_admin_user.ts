import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import { BaseSchema } from '@adonisjs/lucid/schema'
import { randomUUID } from 'node:crypto'
import validator from 'validator'

export default class extends BaseSchema {
  async up() {
    // Create an admin user if there are no users
    const users = await this.db.from('users')
    const adminEmail = env.get('INITIAL_ADMIN_EMAIL')
    const adminPassword = env.get('INITIAL_ADMIN_PASSWORD')
    if (users.length === 0 && adminEmail && adminPassword) {
      await this.db.table('users').insert({
        id: randomUUID(),
        full_name: 'Admin',
        verified: true,
        email: validator.normalizeEmail(adminEmail),
        password: await hash.make(adminPassword),
        is_admin: true,
        created_at: this.now(),
        updated_at: this.now(),
      })
    }
  }

  async down() {}
}
