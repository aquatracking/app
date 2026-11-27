/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { setupThrottle } from '#start/limiter'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

/**
 * Provisional home page, replaced by the list of vivariums in feature 04.
 */
router.on('/').renderInertia('home', {}).as('home').use(middleware.auth())

router.get('/health/live', [controllers.HealthChecks, 'live'])

router.get('/setup', [controllers.Setup, 'show'])
router.post('/setup', [controllers.Setup, 'store']).use(setupThrottle)
