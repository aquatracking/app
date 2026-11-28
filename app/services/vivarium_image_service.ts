import sharp from 'sharp'
import { v7 as uuidv7 } from 'uuid'
import Vivarium from '#models/vivarium'
import db from '@adonisjs/lucid/services/db'
import drive from '@adonisjs/drive/services/main'
import InvalidImageException from '#exceptions/invalid_image_exception'

/**
 * Longest side of a stored image, in pixels.
 */
const MAX_IMAGE_SIZE = 1600

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
   * The previous image is read with the vivarium locked, so that of two
   * simultaneous replacements, the second one deletes the image of the
   * first. A new file whose save fails or is refused (vivarium archived
   * meanwhile) is deleted. The caller keeps the
   * source file: the temporary file of an upload is deleted by
   * delete_uploaded_files_middleware.
   *
   * @throws InvalidImageException when the file cannot be decoded, which
   * includes any format other than JPEG, PNG or WebP
   * @throws ArchivedVivariumException when the vivarium was archived meanwhile
   * @throws E_ROW_NOT_FOUND when the vivarium was deleted meanwhile
   */
  async replace(vivarium: Vivarium, sourcePath: string) {
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

    const imagePath = `${vivarium.id}/${uuidv7()}.webp`
    await this.disk().put(imagePath, contents)

    let previousPath: string | null
    try {
      previousPath = await this.setImagePath(vivarium, imagePath)
    } catch (error) {
      await this.disk().delete(imagePath)
      throw error
    }
    if (previousPath) {
      await this.disk().delete(previousPath)
    }
  }

  /**
   * @throws ArchivedVivariumException when the vivarium was archived meanwhile
   * @throws E_ROW_NOT_FOUND when the vivarium was deleted meanwhile
   */
  async remove(vivarium: Vivarium) {
    const previousPath = await this.setImagePath(vivarium, null)
    if (previousPath) {
      await this.disk().delete(previousPath)
    }
  }

  /**
   * Saves the path of the image with the vivarium locked, and returns the
   * previous one, read under the lock rather than from the given instance,
   * which another request may have made stale. Refused when the vivarium
   * was archived after the request was authorized
   * (Vivarium.lockUnarchived).
   *
   * @throws ArchivedVivariumException when it was archived meanwhile
   * @throws E_ROW_NOT_FOUND when it was deleted meanwhile
   */
  private async setImagePath(vivarium: Vivarium, imagePath: string | null) {
    const previousPath = await db.transaction(async (trx) => {
      await vivarium.lockUnarchived(trx, 'update')
      const locked = await Vivarium.query({ client: trx }).where('id', vivarium.id).firstOrFail()
      const previous = locked.imagePath
      locked.imagePath = imagePath
      await locked.save()
      return previous
    })
    vivarium.imagePath = imagePath
    return previousPath
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
