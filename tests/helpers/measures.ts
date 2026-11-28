import { DateTime } from 'luxon'
import type User from '#models/user'
import Measure from '#models/measure'
import type Vivarium from '#models/vivarium'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import MeasureType from '#models/measure_type'
import type { ApiClient } from '@japa/api-client'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { TrackedMeasureService } from '#services/tracked_measure_service'

/**
 * Vivariums with tracked measures, measures and readings, for the tests
 * of the measures (docs/features/06-measures.md), of the charts (07) and
 * of the profile (02, time zone).
 */

/**
 * A user and their freshwater aquarium, set up on 2025-01-01, tracking
 * the given types in this order.
 */
export async function vivariumTracking(codes: string[], user?: User) {
  const owner = user ?? (await UserFactory.create())
  const vivarium = await VivariumFactory.merge({
    userId: owner.id,
    startedOn: DateTime.fromISO('2025-01-01'),
  }).create()
  const service = await app.container.make(TrackedMeasureService)
  for (const code of codes) {
    await service.add(vivarium, code)
  }
  return { user: owner, vivarium }
}

/**
 * Measures stored directly, at UTC instants ("2026-01-15T17:00:00Z").
 */
export async function storeMeasures(
  vivarium: Vivarium,
  measuredAt: string,
  values: Record<string, number>
) {
  const types = await MeasureType.query().whereIn('code', Object.keys(values))
  return Measure.createMany(
    types.map((type) => ({
      vivariumId: vivarium.id,
      measureTypeId: type.id,
      value: values[type.code],
      measuredAt: DateTime.fromISO(measuredAt, { zone: 'utc' }),
      source: 'manual' as const,
    }))
  )
}

/**
 * Makes the database refuse every insertion or update of a measure of
 * this type, to fail a change of readings after its first writes. Only
 * within the global transaction of a test, which drops the trigger.
 *
 * Inside the global transaction, the "db.transaction" of the service is a
 * savepoint: the failure rolls back to it and the test then finds the
 * measures unchanged. Without it, the failure aborts the global
 * transaction itself, so the test fails on its next query ("current
 * transaction is aborted") rather than on its assertion.
 */
export async function failWritesOf(code: string) {
  const type = await MeasureType.findByOrFail('code', code)
  await db.rawQuery(
    `create function fail_measure_write() returns trigger language plpgsql
      as $$ begin raise exception 'measure write refused by the test'; end $$`
  )
  await db.rawQuery(
    `create trigger fail_measure_write before insert or update on measures for each row
      when (new.measure_type_id = '${type.id}') execute function fail_measure_write()`
  )
}

/**
 * Measures of the vivarium as "<UTC instant> <code>=<value>", sorted.
 */
export async function measuresOf(vivarium: Vivarium) {
  const measures = await Measure.query().where('vivarium_id', vivarium.id).preload('measureType')
  return measures
    .map(
      (measure) =>
        `${measure.measuredAt.toUTC().toISO({ suppressMilliseconds: true })} ${measure.measureType.code}=${measure.value}`
    )
    .sort()
}

export function postReading(
  client: ApiClient,
  user: User,
  vivarium: Vivarium,
  data: { measuredAt: string; values: Record<string, string | null> }
) {
  return client
    .post(`/vivariums/${vivarium.id}/readings`)
    .withInertia()
    .header('referer', `/vivariums/${vivarium.id}`)
    .json(data)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

export function readingUrl(vivarium: Vivarium, measuredAt: string) {
  return `/vivariums/${vivarium.id}/readings/${measuredAt}`
}

export function putReading(
  client: ApiClient,
  user: User,
  vivarium: Vivarium,
  measuredAt: string,
  data: { measuredAt: string; values: Record<string, string | null> }
) {
  return client
    .put(readingUrl(vivarium, measuredAt))
    .withInertia()
    .header('referer', `${readingUrl(vivarium, measuredAt)}/edit`)
    .json(data)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

export function deleteReading(
  client: ApiClient,
  user: User,
  vivarium: Vivarium,
  measuredAt: string
) {
  return client
    .delete(readingUrl(vivarium, measuredAt))
    .withInertia()
    .header('referer', `/vivariums/${vivarium.id}/measures`)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}
