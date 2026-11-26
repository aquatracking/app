/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
| Any value can be read from a file with the "file:" prefix, for Docker
| secrets: APP_KEY=file:/run/secrets/app_key
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number.optional(),
  HOST: Env.schema.string.optional({ format: 'host' }),
  LOG_LEVEL: Env.schema.string.optional(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  TRUSTED_PROXIES: Env.schema.string.optional(),

  // Session: "cookie" by default, "memory" in tests
  SESSION_DRIVER: Env.schema.enum.optional(['cookie', 'memory'] as const),

  // Database
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.secret(),
  DB_DATABASE: Env.schema.string(),

  // Limiter: "database" by default, "memory" in tests
  LIMITER_STORE: Env.schema.enum.optional(['database', 'memory'] as const),

  // Drive
  DRIVE_ROOT: Env.schema.string.optional(),

  // Mail: sending is disabled when SMTP_HOST is empty
  SMTP_HOST: Env.schema.string.optional({ format: 'host' }),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.secret.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional({ format: 'email' }),
  MAIL_FROM_NAME: Env.schema.string.optional(),
})
