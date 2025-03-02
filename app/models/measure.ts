import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import Biotope from './biotope.js'

export default class Measure extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare value: number

  @column()
  declare measureTypeCode: string

  @column.dateTime({ autoCreate: true })
  declare measuredAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare biotopeId: string

  @belongsTo(() => Biotope, {
    foreignKey: 'biotopeId',
  })
  declare biotope: BelongsTo<typeof Biotope>

  @beforeCreate()
  static assignUuid(measure: Measure) {
    measure.id = randomUUID()
  }
}
