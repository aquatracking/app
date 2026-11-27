import User from '#models/user'
import { errors as authErrors } from '@adonisjs/auth'
import limiter from '@adonisjs/limiter/services/main'
import type { Limiter, LimiterResponse } from '@adonisjs/limiter'
import LoginBlockedException from '#exceptions/login_blocked_exception'

/**
 * Failed login attempts are counted on two keys at once
 * (docs/features/02-auth-profile.md):
 * - IP + email: slows down the search for the password of one account;
 * - IP alone: slows down trying a list of credentials from one machine.
 */
const FAILURES_WINDOW = '15 minutes'
const MAX_FAILURES_PER_IP_AND_EMAIL = 5
const MAX_FAILURES_PER_IP = 20

/**
 * Progressive block: 15 minutes for the first block of a key, doubled on
 * each new block of the same key, up to 24 hours. The history of a key is
 * forgotten 24 hours after the end of its last block.
 */
const FIRST_BLOCK_SECONDS = 15 * 60
const MAX_BLOCK_SECONDS = 24 * 60 * 60
const BLOCKS_HISTORY_SECONDS = 24 * 60 * 60

/**
 * Keys of the limiter for an attempt. Exported for the tests, which
 * simulate the end of a block.
 */
export function loginLimiterKeys(ip: string, email: string) {
  return {
    ipAndEmail: `login:ip_email:${ip}:${email}`,
    ip: `login:ip:${ip}`,
  }
}

/**
 * Number of blocks of a key, stored by the limiter under its own key.
 */
function blocksKey(key: string) {
  return `${key}:blocks`
}

export class LoginService {
  /**
   * Counts the blocks of each key. Only its "set" and "get" are used, with
   * their own expiry: the number of allowed requests and the duration of
   * the limiter play no role.
   */
  protected blocksHistory = limiter.use({ requests: 1, duration: BLOCKS_HISTORY_SECONDS })

  /**
   * Checks the credentials of a login attempt from the given IP.
   *
   * @throws LoginBlockedException when a key of the attempt is blocked,
   *   whatever the credentials
   * @throws E_INVALID_CREDENTIALS when the email or the password is wrong,
   *   with the same error in both cases
   */
  async attempt(email: string, password: string, ip: string): Promise<User> {
    const keys = loginLimiterKeys(ip, email)
    const failures = limiter.multi([
      {
        key: keys.ipAndEmail,
        requests: MAX_FAILURES_PER_IP_AND_EMAIL,
        duration: FAILURES_WINDOW,
      },
      { key: keys.ip, requests: MAX_FAILURES_PER_IP, duration: FAILURES_WINDOW },
    ])

    const states = await failures.get()
    const blockedFor = states
      .filter((state) => state !== null && state.remaining <= 0)
      .map((state) => state!.availableIn)
    if (blockedFor.length > 0) {
      throw new LoginBlockedException(Math.max(...blockedFor))
    }

    /**
     * The attempt is counted as a failure before the password is checked,
     * with an atomic increment: of simultaneous attempts, only those that
     * fit in the limit are checked.
     */
    const reserved = await failures.increment()
    const overLimit = reserved
      .filter(({ consumed, limit }) => consumed > limit)
      .map(({ availableIn }) => availableIn)
    if (overLimit.length > 0) {
      throw new LoginBlockedException(Math.max(...overLimit))
    }

    const [ipAndEmail, ipOnly] = failures.list()
    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        await this.blockReachedKeys(failures.list(), reserved)
      } else {
        await failures.decrement()
      }
      throw error
    }

    /**
     * A success forgets the failures of this account from this IP, not
     * those of the IP (only the point of this attempt is given back) nor
     * the history of blocks.
     */
    await ipAndEmail.limiter.delete(ipAndEmail.key)
    await ipOnly.limiter.decrement(ipOnly.key)
    return user
  }

  /**
   * Blocks the keys whose limit was reached by this failure. Only one
   * attempt reaches it exactly, so a key is blocked once.
   */
  protected async blockReachedKeys(
    keys: { key: string | number; limiter: Limiter }[],
    reserved: LimiterResponse[]
  ) {
    for (const [index, { key, limiter: keyLimiter }] of keys.entries()) {
      if (reserved[index].consumed === reserved[index].limit) {
        await keyLimiter.block(key, await this.nextBlockDuration(String(key)))
      }
    }
  }

  /**
   * Duration in seconds of a new block of the key, recorded in its history.
   */
  protected async nextBlockDuration(key: string): Promise<number> {
    const history = await this.blocksHistory.get(blocksKey(key))
    const previousBlocks = history?.consumed ?? 0
    const duration = Math.min(FIRST_BLOCK_SECONDS * 2 ** previousBlocks, MAX_BLOCK_SECONDS)

    /**
     * Kept 24 hours after the end of the block, not its start.
     */
    await this.blocksHistory.set(
      blocksKey(key),
      previousBlocks + 1,
      duration + BLOCKS_HISTORY_SECONDS
    )
    return duration
  }
}
