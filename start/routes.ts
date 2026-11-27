/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import { forgotPasswordThrottle, setupThrottle } from '#start/limiter'

/**
 * Provisional home page, replaced by the list of vivariums in feature 04.
 */
router.on('/').renderInertia('home', {}).as('home').use(middleware.auth())

router.get('/health/live', [controllers.HealthChecks, 'live'])

router.get('/setup', [controllers.Setup, 'show'])
router.post('/setup', [controllers.Setup, 'store']).use(setupThrottle)

/**
 * Pages for visitors who are not signed in.
 */
router
  .group(() => {
    router.get('/login', [controllers.auth.Session, 'create'])
    router.post('/login', [controllers.auth.Session, 'store'])

    router.get('/invitations/:token', [controllers.auth.Registration, 'create'])
    router.post('/invitations/:token', [controllers.auth.Registration, 'store'])

    router.get('/forgot-password', [controllers.auth.PasswordReset, 'create'])
    router
      .post('/forgot-password', [controllers.auth.PasswordReset, 'store'])
      .use(forgotPasswordThrottle)
    router.get('/reset-password/:token', [controllers.auth.PasswordReset, 'edit'])
    router.post('/reset-password/:token', [controllers.auth.PasswordReset, 'update'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('/logout', [controllers.auth.Session, 'destroy'])

    router.get('/profile', [controllers.Profile, 'edit'])
    router.put('/profile', [controllers.Profile, 'update'])
    router.put('/profile/password', [controllers.Profile, 'updatePassword'])
  })
  .use(middleware.auth())
