import { sep } from 'node:path'
import { defineConfig } from '@adonisjs/static'

/**
 * Configuration options to tweak the static files middleware.
 * The complete set of options are documented on the
 * official documentation website.
 *
 * https://docs.adonisjs.com/guides/basics/static-file-server
 */
const staticServerConfig = defineConfig({
  /**
   * Enable or disable static file serving middleware.
   */
  enabled: true,

  /**
   * URL paths to look up in the "public" directory. Any other request
   * skips the filesystem and goes to your routes. Add the path of each
   * file or folder that you put in the "public" directory.
   */
  prefixes: ['/assets', '/favicon.svg'],

  /**
   * Generate ETag headers for client/proxy caching.
   */
  etag: true,

  /**
   * Include Last-Modified headers for conditional requests.
   */
  lastModified: true,

  /**
   * Policy for files starting with a dot.
   */
  dotFiles: 'ignore',

  /**
   * Vite assets have a content hash in their name: a new build gives new
   * URLs, so browsers can keep them for a year without asking again.
   */
  headers: (path) => {
    if (path.includes(`${sep}public${sep}assets${sep}`)) {
      return { 'Cache-Control': 'public, max-age=31536000, immutable' }
    }
    return {}
  },
})

export default staticServerConfig
