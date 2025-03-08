import MailService from '#services/mail_service'
import string from '@adonisjs/core/helpers/string'
import app from '@adonisjs/core/services/app'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

const TOKEN_SIZE = 64

export default class UserInvitation extends BaseModel {
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

  isExpired() {
    return this.expiresAt < DateTime.now()
  }

  @beforeCreate()
  static assignUuid(userInvitation: UserInvitation) {
    userInvitation.id = randomUUID()
  }

  static async generateInvite(email: string, locale: string) {
    const mailService = await app.container.make(MailService)

    const token = string.generateRandom(TOKEN_SIZE)
    const expiresAt = DateTime.now().plus({ days: 7 })

    const invitation = await UserInvitation.create({
      email,
      token,
      expiresAt,
    })
    await mailService.sendUserInvitation(email, token, locale)

    return invitation
  }
}
