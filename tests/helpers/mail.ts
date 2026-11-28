import app from '@adonisjs/core/services/app'

/**
 * The instance sends emails or not depending on SMTP_HOST: each test
 * chooses, and its group restores the configured value after it.
 */
export function useMail(enabled: boolean) {
  app.config.set('app.mail.enabled', enabled)
}
