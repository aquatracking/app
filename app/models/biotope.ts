import { BaseModel, beforeCreate, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import User from './user.js'

export default class Biotope extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare type: 'aquarium' | 'terrarium'

  @column()
  declare volume: number | null

  @column({ prepare: (value) => value ?? new Date() })
  declare startedDate: Date

  @column()
  declare archivedDate: Date | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare userId: string

  @hasOne(() => User, {
    foreignKey: 'id',
    localKey: 'userId',
  })
  declare user: HasOne<typeof User>

  @beforeCreate()
  static assignUuid(biotope: Biotope) {
    biotope.id = randomUUID()
  }
}
