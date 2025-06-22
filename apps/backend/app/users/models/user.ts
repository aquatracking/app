import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export interface UserModel {
  id: string
  fullName: string | null
  email: string
  password: string
  verified: boolean
  isAdmin: boolean
  createdAt: DateTime
  updatedAt: DateTime | null
}

export default class User extends compose(BaseModel, AuthFinder) implements UserModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column({
    consume: (value) => !!value,
  })
  declare verified: boolean

  @column({
    consume: (value) => !!value,
  })
  declare isAdmin: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static readonly rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }
}
