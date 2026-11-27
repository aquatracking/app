import { basename } from 'node:path'
import type Vivarium from '#models/vivarium'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { urlFor } from '@adonisjs/core/services/url_builder'

export default class VivariumTransformer extends BaseTransformer<Vivarium> {
  /**
   * A vivarium as shown on its cards, its dashboard and its form. The
   * image is served by a route protected by VivariumPolicy.
   */
  toObject() {
    const { imagePath } = this.resource
    return {
      ...this.pick(this.resource, [
        'id',
        'kind',
        'name',
        'description',
        'waterType',
        'climate',
        'lengthCm',
        'widthCm',
        'heightCm',
        'volumeLiters',
        'isArchived',
      ]),
      startedOn: this.resource.startedOn.toISODate()!,
      imageUrl: imagePath
        ? urlFor('vivarium_images.show', { id: this.resource.id, filename: basename(imagePath) })
        : null,
    }
  }

  /**
   * A vivarium on the cards of the home page and of the archived ones,
   * with the instant of its last reading, null without any. The query
   * computes it ("withAggregate", as "lastMeasuredAt").
   */
  forCard() {
    const lastMeasuredAt: Date | null = this.resource.$extras.lastMeasuredAt ?? null
    return {
      ...this.toObject(),
      lastMeasuredAt: lastMeasuredAt ? lastMeasuredAt.toISOString() : null,
    }
  }
}
