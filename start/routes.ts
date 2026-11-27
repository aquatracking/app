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

/**
 * Administration (docs/features/03-admin.md): administrators only, others
 * get 403.
 */
router
  .group(() => {
    router.get('/users', [controllers.admin.Users, 'index'])
    router
      .put('/users/:id/admin', [controllers.admin.Users, 'toggleAdmin'])
      .where('id', router.matchers.uuid())
    router
      .delete('/users/:id', [controllers.admin.Users, 'destroy'])
      .where('id', router.matchers.uuid())
    router
      .post('/users/:id/password-reset', [controllers.admin.Users, 'createPasswordReset'])
      .where('id', router.matchers.uuid())

    router.get('/invitations', [controllers.admin.Invitations, 'index'])
    router.post('/invitations', [controllers.admin.Invitations, 'store'])
    router
      .post('/invitations/:id/renew', [controllers.admin.Invitations, 'renew'])
      .where('id', router.matchers.uuid())
    router
      .delete('/invitations/:id', [controllers.admin.Invitations, 'destroy'])
      .where('id', router.matchers.uuid())
  })
  .prefix('/admin')
  .as('admin')
  .use([middleware.auth(), middleware.admin()])
