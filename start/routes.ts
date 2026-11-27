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

    /**
     * Vivariums (docs/features/04-vivariums.md). The home page lists them.
     * There is no route to delete a vivarium.
     */
    router.get('/', [controllers.Vivariums, 'index'])
    router.get('/vivariums/archived', [controllers.Vivariums, 'archived'])
    router.get('/vivariums/create', [controllers.Vivariums, 'create'])
    router.post('/vivariums', [controllers.Vivariums, 'store'])

    /**
     * Routes of one vivarium: ":id" is a UUID, so that "/vivariums/archived"
     * and "/vivariums/create" are never taken for one.
     */
    router
      .group(() => {
        router.get('/', [controllers.Vivariums, 'show'])
        router.get('/edit', [controllers.Vivariums, 'edit'])
        router.put('/', [controllers.Vivariums, 'update'])
        router.post('/archive', [controllers.Vivariums, 'archive'])
        router.post('/unarchive', [controllers.Vivariums, 'unarchive'])
        router.put('/image', [controllers.VivariumImages, 'update'])
        router.delete('/image', [controllers.VivariumImages, 'destroy'])
        router.get('/image/:filename', [controllers.VivariumImages, 'show'])
      })
      .prefix('/vivariums/:id')
      .where('id', router.matchers.uuid())
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
