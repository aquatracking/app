import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/limiter'

const limiterConfig = defineConfig({
  default: env.get('LIMITER_STORE', 'database'),

  stores: {
    /**
     * Counters live in PostgreSQL, so they survive restarts and are shared
     * between instances. Expired rows are purged every 5 minutes.
     */
    database: stores.database({
      tableName: 'rate_limits',
      clearExpiredByTimeout: true,
    }),

    /**
     * Used by the test suite.
     */
    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
