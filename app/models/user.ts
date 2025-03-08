import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import UserToken from './user_token.js'
import Biotope from './biotope.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare verified: boolean

  @column()
  declare isAdmin: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => UserToken)
  declare tokens: HasMany<typeof UserToken>

  @hasMany(() => UserToken, {
    onQuery: (query) => query.where('type', 'PASSWORD_RESET'),
  })
  declare passwordResetToken: HasMany<typeof UserToken>

  @hasMany(() => UserToken, {
    onQuery: (query) => query.where('type', 'EMAIL_VERIFICATION'),
  })
  declare emailVerificationToken: HasMany<typeof UserToken>

  static readonly rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @hasMany(() => Biotope)
  declare biotopes: HasMany<typeof Biotope>

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }
}
