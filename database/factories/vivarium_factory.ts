import { DateTime } from 'luxon'
import Vivarium from '#models/vivarium'
import factory from '@adonisjs/lucid/factories'

/**
 * Freshwater aquariums by default. The owner comes from "merge({ userId })".
 */
export const VivariumFactory = factory
  .define(Vivarium, ({ faker }) => {
    return {
      kind: 'aquarium' as const,
      name: faker.word.words(2),
      waterType: 'fresh' as const,
      climate: null,
      startedOn: DateTime.utc().minus({ months: 6 }).startOf('day'),
    }
  })
  .build()
