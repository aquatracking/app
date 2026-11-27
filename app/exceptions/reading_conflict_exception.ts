import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * Raised when a reading would give a vivarium two measures of a type at
 * the same minute (docs/features/06-measures.md). Shown as an error on
 * the date of the form, which stays open with its values, inviting to
 * edit the existing reading instead.
 */
export default class ReadingConflictException extends Exception {
  static status = 409
  static code = 'E_READING_CONFLICT'
  static message = 'A reading at this date and time already has a value of these measure types'

  /**
   * @param codes Measure types already measured at this minute.
   */
  constructor(readonly codes: string[]) {
    super()
  }

  async handle(error: this, ctx: HttpContext) {
    const types = new Intl.ListFormat(ctx.i18n.locale, { type: 'conjunction' }).format(
      error.codes.map((code) => ctx.i18n.t(`measure_types.${code}.label`))
    )
    ctx.session.flashInputErrors({
      measuredAt: ctx.i18n.t(`errors.${error.code}`, { types }, error.message),
    })
    return ctx.response.redirect().back()
  }
}
