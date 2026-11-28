import sharp from 'sharp'
import { join } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import InvalidImageException from '#exceptions/invalid_image_exception'
import { VivariumImageService } from '#services/vivarium_image_service'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import type User from '#models/user'
import type Vivarium from '#models/vivarium'
import drive from '@adonisjs/drive/services/main'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'

/**
 * A JPEG photo of 3000 × 2000 px, with EXIF data and an orientation
 * that turns it to portrait (6: rotate 90° clockwise).
 */
function photo() {
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#2a9df4' } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'Ada Lovelace' } } })
    .toBuffer()
}

function uploadImage(
  client: ApiClient,
  user: User,
  vivarium: Vivarium,
  contents: Buffer,
  filename = 'photo.jpg'
) {
  return client
    .put(`/vivariums/${vivarium.id}/image`)
    .withInertia()
    .header('referer', `/vivariums/${vivarium.id}/edit`)
    .file('image', contents, { filename })
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

function removeImage(client: ApiClient, user: User, vivarium: Vivarium) {
  return client
    .delete(`/vivariums/${vivarium.id}/image`)
    .withInertia()
    .header('referer', `/vivariums/${vivarium.id}/edit`)
    .withCsrfToken()
    .loginAs(user)
    .redirects(0)
}

test.group('Vivarium images', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('vivariums')
    return () => drive.restore('vivariums')
  })

  test('VIV-7 a valid image is stored as a WebP of 1600 px at most, without EXIF', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    const response = await uploadImage(client, user, vivarium, await photo())

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    response.assertFlashMessage('notification', {
      type: 'success',
      message: 'The photo has been saved.',
    })
    await vivarium.refresh()
    assert.match(vivarium.imagePath!, new RegExp(`^${vivarium.id}/[0-9a-f-]{36}\\.webp$`))

    const stored = await sharp(
      await drive.use('vivariums').getBytes(vivarium.imagePath!)
    ).metadata()
    assert.equal(stored.format, 'webp')
    /**
     * The orientation is applied before resizing: the landscape photo
     * becomes a 1067 × 1600 portrait, with no orientation left to apply.
     */
    assert.equal(stored.width, 1067)
    assert.equal(stored.height, 1600)
    assert.isUndefined(stored.exif)
    assert.isUndefined(stored.orientation)
  })

  test('VIV-7 a small image is not enlarged', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer()

    await uploadImage(client, user, vivarium, small, 'small.png')

    await vivarium.refresh()
    const stored = await sharp(
      await drive.use('vivariums').getBytes(vivarium.imagePath!)
    ).metadata()
    assert.equal(stored.width, 400)
    assert.equal(stored.height, 300)
  })

  test('VIV-7 a file that is not an image is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    /**
     * The type comes from the content, not the file name. A truncated
     * JPEG has the right content type but cannot be decoded.
     */
    const text = await uploadImage(client, user, vivarium, Buffer.from('not an image'), 'notes.txt')
    const disguised = await uploadImage(client, user, vivarium, Buffer.from('text'), 'photo.jpg')
    const jpeg = await photo()
    const truncated = await uploadImage(client, user, vivarium, jpeg.subarray(0, 300))

    for (const response of [text, disguised]) {
      const errors = response.flashMessages().inputErrorsBag as Record<string, string[]>
      assert.deepEqual(errors.image, ['Choose a JPEG, PNG or WebP image'])
    }
    truncated.assertFlashMessage('notification', {
      type: 'error',
      message: 'This image cannot be read. Try a JPEG, PNG or WebP file.',
    })
    await vivarium.refresh()
    assert.isNull(vivarium.imagePath)
    assert.deepEqual(
      await drive
        .use('vivariums')
        .listAll(vivarium.id)
        .then((list) => [...list.objects]),
      []
    )
  })

  test('VIV-7 an image in another format than JPEG, PNG or WebP is refused, whatever its name', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()

    /**
     * An SVG has no binary signature: beyond the first 4100 bytes read to
     * find one, the type falls back on the file name. sharp decodes it.
     */
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
        `<!-- ${'padding '.repeat(600)} -->` +
        `<rect width="200" height="200" fill="#2a9df4"/></svg>`
    )
    assert.isAbove(svg.length, 4100)
    const { format } = await sharp(svg).metadata()
    assert.equal(format, 'svg')

    const response = await uploadImage(client, user, vivarium, svg, 'photo.png')

    const errors = response.flashMessages().inputErrorsBag as Record<string, string[]>
    assert.deepEqual(errors.image, ['Choose a JPEG, PNG or WebP image'])
    await vivarium.refresh()
    assert.isNull(vivarium.imagePath)
    assert.deepEqual(
      await drive
        .use('vivariums')
        .listAll(vivarium.id)
        .then((list) => [...list.objects]),
      []
    )
  })

  test('VIV-7 the image service refuses a format other than JPEG, PNG or WebP', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const path = join(app.tmpPath(), `${vivarium.id}.png`)
    await mkdir(app.tmpPath(), { recursive: true })
    await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
      .gif()
      .toFile(path)

    try {
      await assert.rejects(
        () => new VivariumImageService().replace(vivarium, path),
        InvalidImageException
      )
    } finally {
      await rm(path)
    }
    await vivarium.refresh()
    assert.isNull(vivarium.imagePath)
  })

  test('VIV-7 an image of more than 15 MB is refused', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const header = await photo()
    const tooLarge = Buffer.concat([header, Buffer.alloc(15 * 1024 * 1024)])

    const response = await uploadImage(client, user, vivarium, tooLarge)

    const errors = response.flashMessages().inputErrorsBag as Record<string, string[]>
    assert.deepEqual(errors.image, ['The file must not exceed 15mb'])
    await vivarium.refresh()
    assert.isNull(vivarium.imagePath)
  })

  test('VIV-8 replacing the image deletes the previous file', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const disk = drive.use('vivariums')

    await uploadImage(client, user, vivarium, await photo())
    await vivarium.refresh()
    const previousPath = vivarium.imagePath!
    await uploadImage(client, user, vivarium, await photo())
    await vivarium.refresh()

    assert.notEqual(vivarium.imagePath, previousPath)
    assert.isFalse(await disk.exists(previousPath))
    assert.isTrue(await disk.exists(vivarium.imagePath!))
  })

  test('VIV-8 removing the image deletes its file', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await uploadImage(client, user, vivarium, await photo())
    await vivarium.refresh()
    const previousPath = vivarium.imagePath!

    const response = await removeImage(client, user, vivarium)

    response.assertHeader('location', `/vivariums/${vivarium.id}`)
    await vivarium.refresh()
    assert.isNull(vivarium.imagePath)
    assert.isFalse(await drive.use('vivariums').exists(previousPath))
  })

  test('VIV-2 the image of the vivarium of another user can be neither changed nor removed', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.create()
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: owner.id }).create()
    await uploadImage(client, owner, vivarium, await photo())
    await vivarium.refresh()
    const imagePath = vivarium.imagePath!

    const replaced = await uploadImage(client, user, vivarium, await photo())
    const removed = await removeImage(client, user, vivarium)

    replaced.assertStatus(404)
    removed.assertStatus(404)
    await vivarium.refresh()
    assert.equal(vivarium.imagePath, imagePath)
    assert.isTrue(await drive.use('vivariums').exists(imagePath))
  })

  test('VIV-11 the image of an archived vivarium can be neither changed nor removed', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await uploadImage(client, user, vivarium, await photo())
    await vivarium.refresh()
    const imagePath = vivarium.imagePath!
    vivarium.archivedAt = DateTime.now()
    await vivarium.save()
    const refusal = {
      type: 'error',
      message: 'This tank is archived: unarchive it to change it.',
    }

    const replaced = await uploadImage(client, user, vivarium, await photo())
    const removed = await removeImage(client, user, vivarium)

    replaced.assertFlashMessage('notification', refusal)
    removed.assertFlashMessage('notification', refusal)
    await vivarium.refresh()
    assert.equal(vivarium.imagePath, imagePath)
    assert.isTrue(await drive.use('vivariums').exists(imagePath))
  })

  test('the image is served to its owner only, under its current file name', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    await uploadImage(client, user, vivarium, await photo())
    await vivarium.refresh()
    const filename = vivarium.imagePath!.split('/')[1]

    const show = await client.get(`/vivariums/${vivarium.id}`).withInertia().loginAs(user)
    const served = await client.get(`/vivariums/${vivarium.id}/image/${filename}`).loginAs(user)
    const stale = await client.get(`/vivariums/${vivarium.id}/image/old.webp`).loginAs(user)
    const foreign = await client.get(`/vivariums/${vivarium.id}/image/${filename}`).loginAs(other)
    const guest = await client.get(`/vivariums/${vivarium.id}/image/${filename}`).redirects(0)

    show.assertInertiaPropsContains({
      vivarium: { imageUrl: `/vivariums/${vivarium.id}/image/${filename}` },
    })
    served.assertStatus(200)
    served.assertHeader('content-type', 'image/webp')
    assert.include(served.header('cache-control'), 'immutable')
    stale.assertStatus(404)
    foreign.assertStatus(404)
    guest.assertHeader('location', '/login')
  })
})
