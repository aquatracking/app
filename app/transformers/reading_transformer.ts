import type { Reading } from '#services/reading_service'
import { BaseTransformer } from '@adonisjs/core/transformers'
import MeasureTransformer from '#transformers/measure_transformer'

/**
 * A reading: its instant in UTC, which identifies it in the routes
 * ("2026-11-26T17:42:00Z"), and its measures.
 */
export default class ReadingTransformer extends BaseTransformer<Reading> {
  /**
   * @param timezone Time zone of the user, for the "forEdit" variant.
   */
  constructor(
    resource: Reading,
    protected timezone = 'UTC'
  ) {
    super(resource)
  }

  toObject() {
    return {
      measuredAt: this.resource.measuredAt.toUTC().toISO({ suppressMilliseconds: true })!,
      measures: MeasureTransformer.transform(this.resource.measures),
    }
  }

  /**
   * A reading being edited, with its date and time in the time zone of
   * the user as a "datetime-local" field expects them.
   */
  forEdit() {
    return {
      ...this.toObject(),
      localMeasuredAt: this.resource.measuredAt
        .setZone(this.timezone)
        .toFormat("yyyy-MM-dd'T'HH:mm"),
    }
  }
}
