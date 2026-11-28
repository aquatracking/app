import sharp from 'sharp'
import { v7 as uuidv7 } from 'uuid'
import type Vivarium from '#models/vivarium'
import drive from '@adonisjs/drive/services/main'
import InvalidImageException from '#exceptions/invalid_image_exception'

/**
 * Longest side of a stored image, in pixels.
 */
const MAX_IMAGE_SIZE = 1600

/**
 * Formats accepted for an image, as read by sharp from the content of the
 * file (docs/features/04-vivariums.md). sharp decodes others too (SVG,
 * GIF, TIFF…), which are refused.
 */
export const IMAGE_FORMATS = ['jpeg', 'png', 'webp']

/**
 * Format of an image read from its content, or undefined when sharp does
 * not recognize it.
 */
export async function imageFormatOf(path: string): Promise<string | undefined> {
  try {
    const { format } = await sharp(path).metadata()
    return format
  } catch {
    return undefined
  }
}

/**
 * Images of the vivariums, on the "vivariums" Drive disk under
 * "<vivarium_id>/<uuid>.webp" (docs/features/04-vivariums.md). The file
 * name changes with each image, so browsers may cache it for good.
 */
export class VivariumImageService {
  private disk() {
    return drive.use('vivariums')
  }

  /**
   * Stores the image as WebP, its longest side at most 1600 px, without
   * metadata (sharp drops EXIF unless asked to keep it; the orientation
   * is applied before), then deletes the previous image.
   *
   * @throws InvalidImageException when the file is not in an accepted
   * format or cannot be decoded
   */
  async replace(vivarium: Vivarium, sourcePath: string) {
    if (!IMAGE_FORMATS.includes((await imageFormatOf(sourcePath)) ?? '')) {
      throw new InvalidImageException()
    }

    let contents: Buffer
    try {
      contents = await sharp(sourcePath)
        .rotate()
        .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp()
        .toBuffer()
    } catch {
      throw new InvalidImageException()
    }

    const previousPath = vivarium.imagePath
    const imagePath = `${vivarium.id}/${uuidv7()}.webp`
    await this.disk().put(imagePath, contents)

    vivarium.imagePath = imagePath
    await vivarium.save()

    if (previousPath) {
      await this.disk().delete(previousPath)
    }
  }

  async remove(vivarium: Vivarium) {
    const previousPath = vivarium.imagePath
    if (!previousPath) {
      return
    }

    vivarium.imagePath = null
    await vivarium.save()
    await this.disk().delete(previousPath)
  }

  /**
   * Deletes the image files of vivariums already deleted from the
   * database, with the account of their owner.
   */
  async deleteFilesOf(vivariumIds: string[]) {
    for (const vivariumId of vivariumIds) {
      await this.disk().deleteAll(vivariumId)
    }
  }
}
