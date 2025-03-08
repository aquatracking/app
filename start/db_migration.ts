import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import { MigrationRunner } from '@adonisjs/lucid/migration'
import env from './env.js'
import logger from '@adonisjs/core/services/logger'

if (env.get('DB_MIGRATE_ON_START')) {
  logger.info('Running database migrations...')

  const migrator = new MigrationRunner(db, app, {
    direction: 'up',
  })

  await migrator.run()

  logger.info('Database migrations completed')
}
