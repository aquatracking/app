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
