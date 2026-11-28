import { rm } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { MultipartFile } from '@adonisjs/core/bodyparser'

/**
 * Temporary paths of the uploaded files, at any depth of the field names
 * ("photos[0]", "a[b]").
 */
function temporaryPaths(files: unknown): string[] {
  if (files instanceof MultipartFile) {
    return files.tmpPath ? [files.tmpPath] : []
  }
  if (files && typeof files === 'object') {
    return Object.values(files).flatMap(temporaryPaths)
  }
  return []
}

/**
 * Deletes the temporary files of the request once it is handled, whatever
 * its outcome (docs/architecture.md, "Envois de fichiers"). The bodyparser
 * writes them before CSRF, authentication and validation, and only
 * deletes a file whose stream fails. Registered before the bodyparser, so
 * that it also runs when the bodyparser or a later middleware throws.
 */
export default class DeleteUploadedFilesMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      return await next()
    } finally {
      await Promise.all(
        temporaryPaths(ctx.request.allFiles()).map((path) => rm(path, { force: true }))
      )
    }
  }
}
