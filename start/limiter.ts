/*
|--------------------------------------------------------------------------
| Rate limiters
|--------------------------------------------------------------------------
|
| Each limiter is a middleware applied to its routes in start/routes.ts.
| Without "usingKey", the key is the name of the limiter and the IP of
| the client.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/**
 * Submissions of the setup form: 10 per minute and per IP.
 */
export const setupThrottle = limiter.define('setup', () => {
  return limiter.allowRequests(10).every('1 minute')
})

/**
 * Requests of a password reset link: 3 per hour and per IP. Login
 * attempts are limited by the login service, which counts failures only.
 */
export const forgotPasswordThrottle = limiter.define('forgot_password', () => {
  return limiter.allowRequests(3).every('1 hour')
})
