import vine from '@vinejs/vine'
import { open } from 'node:fs/promises'
import { MultipartFile } from '@adonisjs/core/bodyparser'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Tells whether a file starts with the signature of an accepted format
 * (docs/features/04-vivariums.md): JPEG, PNG or WebP. Only the first
 * bytes are read, nothing is decoded. sharp only decodes these formats
 * (start/image_decoders.ts).
 */
async function hasImageSignature(path: string): Promise<boolean> {
  const handle = await open(path)
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(12), 0, 12, 0)
    const bytes = buffer.subarray(0, bytesRead)
    const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('latin1')
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    const png = bytes.subarray(0, 8).equals(PNG_SIGNATURE)
    const webp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    return jpeg || png || webp
  } finally {
    await handle.close()
  }
}

/**
 * Refuses a file that does not start with the signature of an accepted
 * format. The type checked by "extnames" comes from the first bytes of
 * the file, or from its name when they are not recognized: a large SVG
 * named "photo.png" passes it. A file with the right signature that does
 * not decode is refused by the image service.
 */
export const imageFormat = vine.createRule(
  async (value, _, field) => {
    if (!(value instanceof MultipartFile) || !value.tmpPath) {
      return
    }
    if (!(await hasImageSignature(value.tmpPath))) {
      field.report('The {{ field }} field must be a JPEG, PNG or WebP image', 'imageFormat', field)
    }
  },
  { isAsync: true }
)
