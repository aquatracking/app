import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export interface UserInvitationModel {
  id: string
  email: string
  token: string
  expiresAt: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}

export default class UserInvitation extends BaseModel implements UserInvitationModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(userInvitation: UserInvitation) {
    userInvitation.id = randomUUID()
  }
}
