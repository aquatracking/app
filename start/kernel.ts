/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#exceptions/handler'))

/**
 * Session, authentication and locale run as server middleware, so that
 * error pages of unknown URLs (404) know the user and their language.
 */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent_auth_middleware'),
  () => import('#middleware/last_seen_middleware'),
  () => import('#middleware/detect_user_locale_middleware'),
  () => import('#middleware/inertia_middleware'),
])

/**
 * Uploaded files are deleted once the request is handled: their middleware
 * comes before the bodyparser, which writes them.
 */
router.use([
  () => import('#middleware/delete_uploaded_files_middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('#middleware/setup_middleware'),
  () => import('#middleware/initialize_bouncer_middleware'),
])

/**
 * Named middleware, applied route by route in start/routes.ts.
 */
export const middleware = router.named({
  admin: () => import('#middleware/admin_middleware'),
  auth: () => import('#middleware/auth_middleware'),
  guest: () => import('#middleware/guest_middleware'),
})
