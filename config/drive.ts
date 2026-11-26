import { resolve } from 'node:path'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

const driveConfig = defineConfig({
  default: 'vivariums',

  services: {
    /**
     * Vivarium images. Files are never served directly: a controller
     * protected by VivariumPolicy streams them.
     */
    vivariums: services.fs({
      location: resolve(app.makePath(), env.get('DRIVE_ROOT', 'storage')),
      serveFiles: false,
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
