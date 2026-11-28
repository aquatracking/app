import { DateTime } from 'luxon'
import Vivarium, { CLIMATES, VIVARIUM_KINDS, WATER_TYPES } from '#models/vivarium'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import VivariumPolicy from '#policies/vivarium_policy'
import { VivariumService } from '#services/vivarium_service'
import { ReadingService } from '#services/reading_service'
import TileTransformer from '#transformers/tile_transformer'
import { MeasureSeriesService } from '#services/measure_series_service'
import VivariumTransformer from '#transformers/vivarium_transformer'
import VivariumKindTransformer from '#transformers/vivarium_kind_transformer'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import MeasureTypeDefinitionTransformer from '#transformers/measure_type_definition_transformer'
import { createVivariumValidator, updateVivariumValidator } from '#validators/vivarium'

/**
 * The vivariums of the signed-in user (docs/features/04-vivariums.md).
 * There is no deletion: archiving is the only way to remove a vivarium
 * from the home page.
 */
@inject()
export default class VivariumsController {
  constructor(
    protected readingService: ReadingService,
    protected vivariumService: VivariumService
  ) {}

  /**
   * Home page: the vivariums in service, by name.
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const vivariums = await this.withLastReading(
      user
        .related('vivariums')
        .query()
        .withScopes((scopes) => scopes.active())
    )
    const archived = await user
      .related('vivariums')
      .query()
      .withScopes((scopes) => scopes.archived())
      .first()

    return inertia.render('vivariums/index', {
      vivariums: VivariumTransformer.transform(vivariums).useVariant('forCard'),
      hasArchived: archived !== null,
    })
  }

  async archived({ auth, inertia }: HttpContext) {
    const vivariums = await this.withLastReading(
      auth
        .getUserOrFail()
        .related('vivariums')
        .query()
        .withScopes((scopes) => scopes.archived())
    )

    return inertia.render('vivariums/archived', {
      vivariums: VivariumTransformer.transform(vivariums).useVariant('forCard'),
    })
  }

  async create({ auth, inertia }: HttpContext) {
    return inertia.render('vivariums/create', {
      today: DateTime.now().setZone(auth.getUserOrFail().timezone).toISODate()!,
      kinds: VivariumKindTransformer.transform([...VIVARIUM_KINDS]),
      waterTypes: [...WATER_TYPES],
      climates: [...CLIMATES],
    })
  }

  async store({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createVivariumValidator, {
      meta: { timezone: user.timezone },
    })

    const vivarium = await this.vivariumService.create(user, data)

    session.notify('success', i18n.t('vivariums.created', { name: vivarium.name }))
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  /**
   * Dashboard of the vivarium: its header, one tile per tracked measure
   * and the reading form, whose fields are the tracked measures (none
   * when archived).
   */
  @inject()
  async show(
    { params, auth, bouncer, inertia }: HttpContext,
    measureSeriesService: MeasureSeriesService
  ) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)
    const tiles = await measureSeriesService.tiles(vivarium, {
      timezone: auth.getUserOrFail().timezone,
    })
    const fields = vivarium.isArchived ? [] : await this.readingService.fieldTypes(vivarium)

    return inertia.render('vivariums/show', {
      vivarium: VivariumTransformer.transform(vivarium),
      tiles: TileTransformer.transform(tiles),
      readingFields: MeasureTypeDefinitionTransformer.transform(fields),
    })
  }

  async edit({ params, auth, bouncer, inertia }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)

    return inertia.render('vivariums/edit', {
      vivarium: VivariumTransformer.transform(vivarium),
      today: DateTime.now().setZone(auth.getUserOrFail().timezone).toISODate()!,
      kinds: VivariumKindTransformer.transform([...VIVARIUM_KINDS]),
      waterTypes: [...WATER_TYPES],
      climates: [...CLIMATES],
    })
  }

  /**
   * Saves the form. The kind is not part of it: it cannot change.
   */
  async update({ params, auth, bouncer, request, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const { timezone } = auth.getUserOrFail()
    const firstReading = await this.vivariumService.firstReadingIn(vivarium, timezone)
    const data = await request.validateUsing(updateVivariumValidator, {
      meta: {
        timezone,
        kind: vivarium.kind,
        startedOn: vivarium.startedOn.toISODate()!,
        firstReading: firstReading && {
          date: firstReading.toISODate()!,
          label: firstReading.setLocale(i18n.locale).toLocaleString(DateTime.DATE_MED),
        },
      },
    })

    await this.vivariumService.update(vivarium, data)

    session.notify('success', i18n.t('vivariums.saved', { name: vivarium.name }))
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  async archive({ params, bouncer, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)

    await this.vivariumService.archive(vivarium)

    session.notify('success', i18n.t('vivariums.archived_notice', { name: vivarium.name }))
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  async unarchive({ params, bouncer, response, session, i18n }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('unarchive', vivarium)

    await this.vivariumService.unarchive(vivarium)

    session.notify('success', i18n.t('vivariums.unarchived_notice', { name: vivarium.name }))
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  /**
   * Instant of the last reading of each vivarium, in the same query
   * ("lastMeasuredAt"), by name.
   */
  private withLastReading(query: ModelQueryBuilderContract<typeof Vivarium>) {
    return query
      .withAggregate('measures', (measures) => measures.max('measured_at').as('lastMeasuredAt'))
      .orderBy('name', 'asc')
  }
}
