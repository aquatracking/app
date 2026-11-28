import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  /**
   * Parse request bodies for these HTTP methods.
   * Keep this aligned with methods that receive payloads in your routes.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Config for the "application/x-www-form-urlencoded"
   * content-type parser.
   */
  form: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the form parser.
     */
    types: ['application/x-www-form-urlencoded'],
  },

  /**
   * Config for the JSON parser.
   */
  json: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the JSON parser.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  /**
   * Config for the "multipart/form-data" content-type parser.
   * File uploads are handled by the multipart parser.
   */
  multipart: {
    /**
     * Only the image of a vivarium receives a file (route pattern, not a
     * URL). It is written in the system tmp directory, then deleted once
     * the request is handled (delete_uploaded_files_middleware). On other
     * routes, a multipart body is not read: no file is written and the
     * body is empty (docs/architecture.md, "Envois de fichiers").
     */
    autoProcess: ['/vivariums/:id/image'],

    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Routes where multipart processing is handled manually.
     */
    processManually: [],

    /**
     * Maximum accepted payload size for multipart requests: an image of
     * 15 MB at most (docs/features/04-vivariums.md), with room for the
     * rest of the body.
     */
    limit: '16mb',

    /**
     * Content types handled by the multipart parser.
     */
    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
