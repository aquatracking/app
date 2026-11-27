import env from '#start/env'
import { mail } from '#config/app'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * SMTP is optional: see "mail" in config/app.ts.
 */
const fromAddress = env.get('MAIL_FROM_ADDRESS')
if (mail.enabled && !fromAddress) {
  throw new Error('MAIL_FROM_ADDRESS is required when SMTP_HOST is set')
}

const smtpUsername = env.get('SMTP_USERNAME')

const mailConfig = defineConfig({
  default: 'smtp',

  from: {
    address: fromAddress ?? '',
    name: env.get('MAIL_FROM_NAME', 'AquaTracking'),
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', ''),
      port: env.get('SMTP_PORT', 587),
      secure: env.get('SMTP_SECURE', false),
      auth: smtpUsername
        ? {
            type: 'login',
            user: smtpUsername,
            pass: env.get('SMTP_PASSWORD')?.release() ?? '',
          }
        : undefined,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
