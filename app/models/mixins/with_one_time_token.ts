import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import string from '@adonisjs/core/helpers/string'
import type { BaseModel } from '@adonisjs/lucid/orm'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

/**
 * SHA-256 hash of a one-time token, the only form stored in the database.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Gives a model with "token_hash" and "expires_at" columns the handling of
 * a one-time link (invitation, password reset): the token only exists in
 * the link, the database keeps its hash (docs/data-model.md).
 */
export function withOneTimeToken<Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model
) {
  class ModelWithOneTimeToken extends superclass {
    /**
     * A new random token for a link, and the hash to store.
     */
    static generateToken(): { token: string; tokenHash: string } {
      const token = string.random(40)
      return { token, tokenHash: hashToken(token) }
    }

    /**
     * The unexpired row of the token, if any. Within a transaction, the
     * row is locked until its end, so that the token is used only once.
     */
    static findValidByToken<T extends typeof ModelWithOneTimeToken>(
      this: T,
      token: string,
      trx?: TransactionClientContract
    ): Promise<InstanceType<T> | null> {
      const query = this.query({ client: trx })
        .where('token_hash', hashToken(token))
        .where('expires_at', '>', DateTime.now().toSQL())
      if (trx) {
        query.forUpdate()
      }
      return query.first() as Promise<InstanceType<T> | null>
    }
  }

  return ModelWithOneTimeToken
}
