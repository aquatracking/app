import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * SMTP is optional (ADR 0003): when SMTP_HOST is empty, the instance
 * sends no email and administrators share links by hand.
 */
export const mailEnabled = Boolean(env.get('SMTP_HOST'))

const fromAddress = env.get('MAIL_FROM_ADDRESS')
if (mailEnabled && !fromAddress) {
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
