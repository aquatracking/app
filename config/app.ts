import env from '#start/env'
import proxyAddr from 'proxy-addr'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'

/**
 * Comma separated addresses or subnets of the reverse proxies allowed to
 * set X-Forwarded-For, e.g. "loopback, 172.16.0.0/12". None by default.
 */
const trustedProxies = (env.get('TRUSTED_PROXIES') ?? '')
  .split(',')
  .map((address) => address.trim())
  .filter(Boolean)

/**
 * SMTP is optional (ADR 0003): when SMTP_HOST is empty, the instance
 * sends no email and administrators share links by hand. Read through
 * the config service ("app.mail.enabled"), so that tests can switch it.
 */
export const mail = {
  enabled: Boolean(env.get('SMTP_HOST')),
}

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Generate a unique request id for each incoming request.
   * Useful to correlate logs and debug a request flow.
   */
  generateRequestId: true,

  /**
   * Read the real client IP from X-Forwarded-For only when the request
   * comes from a trusted proxy. Required for rate limiting behind a proxy.
   */
  trustProxy: proxyAddr.compile(trustedProxies),

  /**
   * Allow HTTP method spoofing via the "_method" form/query parameter.
   * This lets HTML forms target PUT/PATCH/DELETE routes while still
   * submitting with POST.
   */
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  router: {
    matcher: 'tree',
  },

  /**
   * Redirect configuration controls the behavior of
   * response.redirect().back() and query string forwarding.
   */
  redirect: {
    /**
     * Redirects do not carry over the query string of the current
     * request: no redirection needs it as is. Those that keep some of it
     * pass it explicitly (history filter and page after editing a
     * reading).
     */
    forwardQueryString: false,
  },

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * Restrict the cookie to a specific domain.
     * Keep empty to use the current host.
     */
    domain: '',

    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Default lifetime for cookies managed by the HTTP layer.
     */
    maxAge: '2h',

    /**
     * Prevent JavaScript access to the cookie in the browser.
     */
    httpOnly: true,

    /**
     * Send cookies only over HTTPS in production.
     */
    secure: app.inProduction,

    /**
     * Cross-site policy for cookie sending.
     */
    sameSite: 'lax',
  },
})
