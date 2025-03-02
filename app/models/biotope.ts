import { BaseModel, beforeCreate, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import User from './user.js'
import { BiotopeType } from '../constant.js'
import Measure from './measure.js'

export default class Biotope extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare type: (typeof BiotopeType)[number]

  @column()
  declare volume: number | null

  @column({ prepare: (value) => value ?? new Date() })
  declare startedDate: Date

  @column()
  declare archivedDate: Date | null

  @column()
  declare saltwater: boolean

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

  @hasMany(() => Measure)
  declare measures: HasMany<typeof Measure>

  @beforeCreate()
  static assignUuid(biotope: Biotope) {
    biotope.id = randomUUID()
  }
}
