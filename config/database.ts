import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT', 5432),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD').release(),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
        /**
         * Managed by @adonisjs/limiter and @adonisjs/auth only, never
         * through a model.
         */
        excludeTables: ['rate_limits', 'remember_me_tokens'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
