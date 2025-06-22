import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export interface UserTokenModel {
  id: string
  userId: string
  type: string
  token: string
  expiresAt: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}

export default class UserToken extends BaseModel implements UserTokenModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare type: string

  @column({ serializeAs: null })
  declare token: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare expiresAt: DateTime

  @beforeCreate()
  static assignUuid(userToken: UserToken) {
    userToken.id = randomUUID()
  }
}
