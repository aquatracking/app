import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, readdir, rm } from 'node:fs/promises'

/**
 * Hook of a test group: the files uploaded during each test are written in
 * a directory of their own, emptied of other processes, then removed. The
 * bodyparser writes them in os.tmpdir(), which reads TMPDIR at each call.
 */
export async function useUploadDirectory() {
  const previous = process.env.TMPDIR
  const directory = await mkdtemp(join(tmpdir(), 'aquatracking-uploads-'))
  process.env.TMPDIR = directory
  return async () => {
    if (previous === undefined) {
      delete process.env.TMPDIR
    } else {
      process.env.TMPDIR = previous
    }
    await rm(directory, { recursive: true, force: true })
  }
}

/**
 * Files left in the upload directory of the current test.
 */
export function uploadedFiles() {
  return readdir(tmpdir())
}
