/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthenticationController = () =>
  import('../app/authentication/controllers/authentication_controller.js')
const UsersController = () => import('../app/users/controllers/users_controller.js')

router
  .get('/', async () => {
    return {
      hello: 'world',
    }
  })
  .as('index')

router
  .group(() => {
    router.post('/login', [AuthenticationController, 'login']).as('login')
    router.post('/logout', [AuthenticationController, 'logout']).as('logout')
  })
  .prefix('/auth')
  .as('auth')

router
  .group(() => {
    router
      .group(() => {
        router.get('/me', [UsersController, 'me']).as('me')
      })
      .prefix('/users')
      .as('users')
  })
  .prefix('/api')
  .as('api')
  .use(middleware.auth())
