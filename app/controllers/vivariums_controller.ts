import { DateTime } from 'luxon'
import Vivarium from '#models/vivarium'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import VivariumPolicy from '#policies/vivarium_policy'
import { VivariumService } from '#services/vivarium_service'
import type { Notification } from '#middleware/inertia_middleware'
import VivariumTransformer from '#transformers/vivarium_transformer'
import { createVivariumValidator, updateVivariumValidator } from '#validators/vivarium'

/**
 * The vivariums of the signed-in user (docs/features/04-vivariums.md).
 * There is no deletion: archiving is the only way to remove a vivarium
 * from the home page.
 */
export default class VivariumsController {
  /**
   * Home page: the vivariums in service, by name.
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const vivariums = await user
      .related('vivariums')
      .query()
      .whereNull('archived_at')
      .orderBy('name', 'asc')
    const archived = await user.related('vivariums').query().whereNotNull('archived_at').first()

    return inertia.render('vivariums/index', {
      vivariums: VivariumTransformer.transform(vivariums),
      hasArchived: archived !== null,
    })
  }

  async archived({ auth, inertia }: HttpContext) {
    const vivariums = await auth
      .getUserOrFail()
      .related('vivariums')
      .query()
      .whereNotNull('archived_at')
      .orderBy('name', 'asc')

    return inertia.render('vivariums/archived', {
      vivariums: VivariumTransformer.transform(vivariums),
    })
  }

  async create({ auth, inertia }: HttpContext) {
    return inertia.render('vivariums/create', {
      today: DateTime.now().setZone(auth.getUserOrFail().timezone).toISODate()!,
    })
  }

  @inject()
  async store(
    { auth, request, response, session, i18n }: HttpContext,
    vivariumService: VivariumService
  ) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createVivariumValidator, {
      meta: { timezone: user.timezone },
    })

    const vivarium = await vivariumService.create(user, data)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('vivariums.created', { name: vivarium.name }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  /**
   * Dashboard of the vivarium: its header here, the tiles of the tracked
   * measures in feature 07.
   */
  async show({ params, bouncer, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)

    return inertia.render('vivariums/show', {
      vivarium: VivariumTransformer.transform(vivarium),
    })
  }

  async edit({ params, auth, bouncer, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)

    return inertia.render('vivariums/edit', {
      vivarium: VivariumTransformer.transform(vivarium),
      today: DateTime.now().setZone(auth.getUserOrFail().timezone).toISODate()!,
    })
  }

  /**
   * Saves the form. The kind is not part of it: it cannot change.
   */
  async update({ params, auth, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const data = await request.validateUsing(updateVivariumValidator, {
      meta: { timezone: auth.getUserOrFail().timezone, kind: vivarium.kind },
    })

    vivarium.merge(data)
    await vivarium.save()

    const notification: Notification = {
      type: 'success',
      message: i18n.t('vivariums.saved', { name: vivarium.name }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  async archive({ params, bouncer, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)

    vivarium.archivedAt = DateTime.now()
    await vivarium.save()

    const notification: Notification = {
      type: 'success',
      message: i18n.t('vivariums.archived_notice', { name: vivarium.name }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  async unarchive({ params, bouncer, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('unarchive', vivarium)

    vivarium.archivedAt = null
    await vivarium.save()

    const notification: Notification = {
      type: 'success',
      message: i18n.t('vivariums.unarchived_notice', { name: vivarium.name }),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }
}
