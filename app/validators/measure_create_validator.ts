import vine from '@vinejs/vine'
import { MeasureTypes } from '../constant.js'

export const measureCreateValidator = vine.compile(
  vine.object({
    measureTypeCode: vine.enum(MeasureTypes.map((type) => type.code)),
    value: vine.number().min(0),
  })
)
