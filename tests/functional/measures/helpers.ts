import { DateTime } from 'luxon'
import type User from '#models/user'
import Measure from '#models/measure'
import type Vivarium from '#models/vivarium'
import app from '@adonisjs/core/services/app'
import MeasureType from '#models/measure_type'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { TrackedMeasureService } from '#services/tracked_measure_service'

/**
 * Helpers of the tests of feature 06 (docs/features/06-measures.md).
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

export function fieldErrors(response: ApiResponse, field: string): string[] {
  const errors = response.flashMessages().inputErrorsBag as Record<string, string[]> | undefined
  return errors?.[field] ?? []
}
