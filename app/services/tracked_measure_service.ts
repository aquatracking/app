import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { isUniqueViolation } from '#database/errors'
import type Vivarium from '#models/vivarium'
import MeasureType from '#models/measure_type'
import TrackedMeasure from '#models/tracked_measure'
import { MeasureTypeCatalog } from '#catalog/measure_types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import TrackedMeasureAlreadyExistsException from '#exceptions/tracked_measure_already_exists_exception'
import InvalidTrackedMeasureOrderException from '#exceptions/invalid_tracked_measure_order_exception'

/**
 * Operations on the tracked measures of a vivarium, callable outside HTTP
 * (docs/features/05-tracked-measures.md). The caller authorizes with
 * VivariumPolicy and validates the codes against the offered catalog
 * entries. Removing a tracked measure never deletes measures.
 */
@inject()
export class TrackedMeasureService {
  constructor(protected catalog: MeasureTypeCatalog) {}

  /**
   * Tracked measures of the vivarium in their order, with their type.
   */
  list(vivarium: Vivarium) {
    return vivarium
      .related('trackedMeasures')
      .query()
      .preload('measureType')
      .orderBy('position', 'asc')
  }

  /**
   * Types of the catalog still offered that the vivarium does not track,
   * in catalog order.
   */
  async addableTypes(vivarium: Vivarium) {
    const codes = this.catalog.offered().map((entry) => entry.code)
    return MeasureType.query()
      .whereIn('code', codes)
      .whereNotIn(
        'id',
        TrackedMeasure.query().where('vivarium_id', vivarium.id).select('measure_type_id')
      )
      .orderBy('position', 'asc')
  }

  /**
   * Tracks the default types of the profile of a new vivarium, in catalog
   * order, within its creation transaction.
   */
  async createDefaults(vivarium: Vivarium, trx: TransactionClientContract) {
    const codes = this.catalog.defaultsFor(vivarium.profile).map((entry) => entry.code)
    if (codes.length === 0) {
      return
    }
    const types = await MeasureType.query({ client: trx })
      .whereIn('code', codes)
      .orderBy('position', 'asc')
    await TrackedMeasure.createMany(
      types.map((type, position) => ({
        vivariumId: vivarium.id,
        measureTypeId: type.id,
        position,
      })),
      { client: trx }
    )
  }

  /**
   * Tracks one more type, in last position. A type already tracked is
   * refused, including by two concurrent requests (unique constraint).
   */
  async add(vivarium: Vivarium, code: string) {
    const type = await MeasureType.findByOrFail('code', code)
    return db.transaction(async (trx) => {
      const existing = await TrackedMeasure.query({ client: trx })
        .where('vivarium_id', vivarium.id)
        .where('measure_type_id', type.id)
        .first()
      if (existing) {
        throw new TrackedMeasureAlreadyExistsException()
      }
      const last = await TrackedMeasure.query({ client: trx })
        .where('vivarium_id', vivarium.id)
        .orderBy('position', 'desc')
        .first()
      const position = last ? last.position + 1 : 0
      try {
        return await TrackedMeasure.create(
          { vivariumId: vivarium.id, measureTypeId: type.id, position },
          { client: trx }
        )
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TrackedMeasureAlreadyExistsException()
        }
        throw error
      }
    })
  }

  async remove(trackedMeasure: TrackedMeasure) {
    await trackedMeasure.delete()
  }

  /**
   * Saves a new order, given as the ids of all the tracked measures of
   * the vivarium. A list that is not exactly these ids is refused.
   */
  async reorder(vivarium: Vivarium, ids: string[]) {
    await db.transaction(async (trx) => {
      const tracked = await TrackedMeasure.query({ client: trx })
        .where('vivarium_id', vivarium.id)
        .select('id')
        .forUpdate()
      const current = new Set(tracked.map(({ id }) => id))
      const given = new Set(ids)
      if (
        given.size !== ids.length ||
        given.size !== current.size ||
        ids.some((id) => !current.has(id))
      ) {
        throw new InvalidTrackedMeasureOrderException()
      }

      /**
       * One query whatever the number of tracked measures: the position
       * of each id is its index in the list.
       */
      await trx.rawQuery(
        `update tracked_measures
          set position = ordered.position - 1, updated_at = now()
          from unnest(?::uuid[]) with ordinality as ordered(id, position)
          where tracked_measures.id = ordered.id`,
        [ids]
      )
    })
  }
}
