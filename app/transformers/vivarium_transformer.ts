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
}
