/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

router
  .get('', [() => import('#controllers/home_controller'), 'index'])
  .as('home')
  .use(middleware.auth())

const LoginController = () => import('#controllers/auth/login_controller')
router.resource('auth/login', LoginController).only(['index', 'store']).use('*', middleware.guest())

const LogoutController = () => import('#controllers/auth/logout_controller')
router.resource('auth/logout', LogoutController).only(['store']).use('*', middleware.auth())

const RegisterController = () => import('#controllers/auth/register_controller')
router
  .resource('auth/register', RegisterController)
  .only(['index', 'store'])
  .use('*', middleware.guest())

const PasswordResetController = () => import('#controllers/auth/password_reset_controller')
router
  .get('auth/password/forgot', [PasswordResetController, 'forgot'])
  .use(middleware.guest())
  .as('auth.password.forgot')
router
  .post('auth/password/forgot', [PasswordResetController, 'send'])
  .use(middleware.guest())
  .as('auth.password.send')
router
  .get('auth/password/reset', [PasswordResetController, 'reset'])
  .use(middleware.guest())
  .as('auth.password.reset')
router
  .post('auth/password/reset', [PasswordResetController, 'store'])
  .use(middleware.guest())
  .as('auth.password.store')

const EmailVerificationController = () => import('#controllers/auth/email_verification_controller')
router.get('auth/email/verify', [EmailVerificationController, 'verify']).as('auth.email.verify')

const BiotopesController = () => import('#controllers/biotopes_controller')
router.resource('biotopes', BiotopesController).use('*', middleware.auth())

const MeasuresController = () => import('#controllers/measures_controller')
router.resource('biotopes.measures', MeasuresController).only(['store']).use('*', middleware.auth())

router
  .group(() => {
    const AdminUsersController = () => import('#controllers/admin/users_controller')
    router.resource('users', AdminUsersController).only(['index'])

    const AdminUsersInvitationController = () =>
      import('#controllers/admin/user_invitations_controller')
    router.resource('invitations', AdminUsersInvitationController).only(['store', 'destroy'])
  })
  .prefix('admin')
  .use(middleware.auth())
  .use(middleware.admin())
  .as('admin')
