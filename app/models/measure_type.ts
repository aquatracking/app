import { compose } from '@adonisjs/core/helpers'
import { MeasureTypeSchema } from '#database/schema'
import { withUuidV7 } from '#models/mixins/with_uuid_v7'

/**
 * Row of a catalog entry (app/catalog/measure_types.ts), written only by
 * the catalog seeder.
 */
export default class MeasureType extends compose(MeasureTypeSchema, withUuidV7) {}
