import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import Measure from '#models/measure'
import type Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import MeasureType from '#models/measure_type'
import type { Infer } from '@vinejs/vine/types'
import type { readingValidator } from '#validators/reading'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import { MeasureTypeCatalog, type MeasureTypeDefinition } from '#catalog/measure_types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import ReadingConflictException from '#exceptions/reading_conflict_exception'

/**
 * A reading (docs/CONTEXT.md): the measures of a vivarium at one instant.
 * Not an entity: it exists only through its measures.
 */
export interface Reading {
  measuredAt: DateTime
  /**
   * In catalog order, with their type preloaded.
   */
  measures: Measure[]
}

export type ReadingData = Infer<typeof readingValidator>

/**
 * Readings per page of the history.
 */
const READINGS_PER_PAGE = 20

/**
 * Unique violation of PostgreSQL: here, two measures of a type at the
 * same instant on a vivarium, inserted concurrently.
 */
const UNIQUE_VIOLATION = '23505'

/**
 * Operations on the readings of a vivarium, callable outside HTTP
 * (docs/features/06-measures.md, ADR 0006). The caller authorizes with
 * VivariumPolicy (an archived vivarium has no reading change) and
 * validates the data with "readingValidator", given the catalog entries
 * of "fieldTypes".
 *
 * A reading is created, edited and deleted as a whole: there is no
 * operation on one measure.
 */
@inject()
export class ReadingService {
  constructor(
    protected catalog: MeasureTypeCatalog,
    protected trackedMeasureService: TrackedMeasureService
  ) {}

  /**
   * Catalog entries of the fields of a reading: the tracked measures in
   * their order, then, when editing, the other types of the reading. A
   * retired type keeps its rules (bounds, decimals).
   */
  async fieldTypes(vivarium: Vivarium, reading?: Reading): Promise<MeasureTypeDefinition[]> {
    const tracked = await this.trackedMeasureService.list(vivarium)
    const codes = tracked.map(({ measureType }) => measureType.code)
    for (const { measureType } of reading?.measures ?? []) {
      if (!codes.includes(measureType.code)) {
        codes.push(measureType.code)
      }
    }
    return codes.map((code) => this.catalog.find(code)!)
  }

  /**
   * The reading of the vivarium at an instant, null when it has no
   * measure then.
   */
  async find(vivarium: Vivarium, measuredAt: DateTime): Promise<Reading | null> {
    const measures = await this.measuresQuery(vivarium).where('measured_at', measuredAt.toISO()!)
    if (measures.length === 0) {
      return null
    }
    return { measuredAt, measures: this.inCatalogOrder(measures) }
  }

  /**
   * Creates one measure per value, all at the instant of the reading
   * truncated to the minute, in one transaction. Refused as a whole when
   * one of the types already has a measure at this minute: the existing
   * reading is to be edited instead.
   */
  async create(vivarium: Vivarium, data: ReadingData) {
    const measuredAt = data.measuredAt.startOf('minute')
    const values = this.filledValues(data)
    const types = await this.typesByCode(Object.keys(values))

    return this.inTransaction(Object.keys(values), async (trx) => {
      await this.assertFree(trx, vivarium, measuredAt, types)
      return Measure.createMany(
        Object.entries(values).map(([code, value]) => ({
          vivariumId: vivarium.id,
          measureTypeId: types.get(code)!.id,
          value,
          measuredAt,
          source: 'manual' as const,
        })),
        { client: trx }
      )
    })
  }

  /**
   * Saves the edited form of a reading, in one transaction: a changed
   * value is updated, a filled empty field creates a measure, an emptied
   * field deletes its measure, and all of them move to the new instant.
   * Moving to a minute that already has one of the types is refused; to
   * a minute with other types only, both readings become one.
   */
  async update(vivarium: Vivarium, reading: Reading, data: ReadingData) {
    const measuredAt = data.measuredAt.startOf('minute')
    const values = this.filledValues(data)
    const types = await this.typesByCode(Object.keys(values))

    await this.inTransaction(Object.keys(values), async (trx) => {
      const measures = await this.measuresQuery(vivarium, trx)
        .where('measured_at', reading.measuredAt.toISO()!)
        .forUpdate()
      if (!measuredAt.equals(reading.measuredAt)) {
        await this.assertFree(trx, vivarium, measuredAt, types)
      }

      const emptied = measures.filter(({ measureType }) => values[measureType.code] === undefined)
      if (emptied.length > 0) {
        await Measure.query({ client: trx })
          .whereIn(
            'id',
            emptied.map(({ id }) => id)
          )
          .delete()
      }

      for (const [code, value] of Object.entries(values)) {
        const measure = measures.find(({ measureType }) => measureType.code === code)
        if (measure) {
          measure.merge({ value, measuredAt })
          await measure.useTransaction(trx).save()
        } else {
          await Measure.create(
            {
              vivariumId: vivarium.id,
              measureTypeId: types.get(code)!.id,
              value,
              measuredAt,
              source: 'manual',
            },
            { client: trx }
          )
        }
      }
    })
  }

  /**
   * Deletes all the measures of the reading. Returns their number.
   */
  async destroy(vivarium: Vivarium, reading: Reading) {
    const deleted = await Measure.query()
      .where('vivarium_id', vivarium.id)
      .where('measured_at', reading.measuredAt.toISO()!)
      .delete()
    return Number(deleted[0])
  }

  /**
   * A page of the history: readings from the most recent, never split
   * between two pages. Filtered by type, a reading has only the measure
   * of this type. A constant number of queries whatever the page size.
   */
  async history(vivarium: Vivarium, options: { page: number; code?: string | null }) {
    const type = options.code ? await MeasureType.findBy('code', options.code) : null
    const filtered = !!options.code

    const instants = await db
      .from('measures')
      .where('vivarium_id', vivarium.id)
      /**
       * An unknown code filters out everything.
       */
      .if(filtered, (query) =>
        type ? query.where('measure_type_id', type.id) : query.whereRaw('false')
      )
      .groupBy('measured_at')
      .orderBy('measured_at', 'desc')
      .select('measured_at')
      .paginate(options.page, READINGS_PER_PAGE)

    const times = instants.all().map((row) => DateTime.fromJSDate(row.measured_at).toUTC())
    const measures =
      times.length === 0
        ? []
        : await this.measuresQuery(vivarium)
            .whereIn(
              'measured_at',
              times.map((time) => time.toISO()!)
            )
            .if(filtered, (query) => query.where('measure_type_id', type!.id))

    const readings: Reading[] = times.map((measuredAt) => ({
      measuredAt,
      measures: this.inCatalogOrder(
        measures.filter((measure) => measure.measuredAt.toMillis() === measuredAt.toMillis())
      ),
    }))
    return { readings, meta: instants.getMeta() }
  }

  /**
   * Types with at least one measure on the vivarium, tracked or not, in
   * catalog order: the filters of the history.
   */
  measuredTypes(vivarium: Vivarium) {
    return MeasureType.query()
      .whereIn(
        'id',
        db.from('measures').where('vivarium_id', vivarium.id).select('measure_type_id')
      )
      .orderBy('position', 'asc')
  }

  /**
   * Instant of the oldest reading of the vivarium, null without any.
   */
  async firstMeasuredAt(vivarium: Vivarium) {
    const row = await db
      .from('measures')
      .where('vivarium_id', vivarium.id)
      .min('measured_at as first')
      .first()
    return row?.first ? DateTime.fromJSDate(row.first).toUTC() : null
  }

  private measuresQuery(vivarium: Vivarium, client?: TransactionClientContract) {
    return Measure.query({ client }).where('vivarium_id', vivarium.id).preload('measureType')
  }

  private inCatalogOrder(measures: Measure[]) {
    return measures.sort((a, b) => a.measureType.position - b.measureType.position)
  }

  /**
   * The values of the form that are filled, by code.
   */
  private filledValues(data: ReadingData) {
    const values: Record<string, number> = {}
    for (const [code, value] of Object.entries(data.values)) {
      if (value !== null && value !== undefined) {
        values[code] = value
      }
    }
    return values
  }

  private async typesByCode(codes: string[]) {
    const types = codes.length === 0 ? [] : await MeasureType.query().whereIn('code', codes)
    return new Map(types.map((type) => [type.code, type]))
  }

  /**
   * Refuses the reading when one of its types already has a measure of
   * the vivarium at this instant.
   */
  private async assertFree(
    trx: TransactionClientContract,
    vivarium: Vivarium,
    measuredAt: DateTime,
    types: Map<string, MeasureType>
  ) {
    if (types.size === 0) {
      return
    }
    const taken = await this.measuresQuery(vivarium, trx)
      .where('measured_at', measuredAt.toISO()!)
      .whereIn(
        'measure_type_id',
        [...types.values()].map(({ id }) => id)
      )
    if (taken.length > 0) {
      throw new ReadingConflictException(this.inCatalogOrder(taken).map((m) => m.measureType.code))
    }
  }

  /**
   * Runs a change of readings in a transaction. A measure inserted
   * concurrently at the same instant violates the unique index: the
   * change is refused like a conflict found beforehand.
   */
  private async inTransaction<T>(
    codes: string[],
    callback: (trx: TransactionClientContract) => Promise<T>
  ) {
    try {
      return await db.transaction(callback)
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ReadingConflictException(codes)
      }
      throw error
    }
  }
}
