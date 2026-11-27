import { basename } from 'node:path'
import Vivarium from '#models/vivarium'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import VivariumPolicy from '#policies/vivarium_policy'
import type { Notification } from '#middleware/inertia_middleware'
import { updateVivariumImageValidator } from '#validators/vivarium'
import { VivariumImageService } from '#services/vivarium_image_service'

/**
 * The image of a vivarium (docs/features/04-vivariums.md). Files are never
 * served by the static server: this controller checks VivariumPolicy.
 */
export default class VivariumImagesController {
  /**
   * Streams the current image. Its file name changes with each image, so
   * browsers keep it for a year; an older file name is a 404.
   */
  async show({ params, bouncer, response }: HttpContext) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('view', vivarium)

    if (!vivarium.imagePath || basename(vivarium.imagePath) !== params.filename) {
      return response.notFound()
    }

    const disk = drive.use('vivariums')
    response.header('Content-Type', 'image/webp')
    response.header('Cache-Control', 'private, max-age=31536000, immutable')
    return response.stream(await disk.getStream(vivarium.imagePath))
  }

  @inject()
  async update(
    { params, bouncer, request, response, session, i18n }: HttpContext,
    vivariumImageService: VivariumImageService
  ) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)
    const { image } = await request.validateUsing(updateVivariumImageValidator)

    await vivariumImageService.replace(vivarium, image.tmpPath!)

    const notification: Notification = { type: 'success', message: i18n.t('vivariums.image.saved') }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }

  @inject()
  async destroy(
    { params, bouncer, response, session, i18n }: HttpContext,
    vivariumImageService: VivariumImageService
  ) {
    const vivarium = await Vivarium.findOrFail(params.id)
    await bouncer.with(VivariumPolicy).authorize('update', vivarium)

    await vivariumImageService.remove(vivarium)

    const notification: Notification = {
      type: 'success',
      message: i18n.t('vivariums.image.removed'),
    }
    session.flash('notification', notification)
    return response.redirect().toRoute('vivariums.show', { id: vivarium.id })
  }
}
