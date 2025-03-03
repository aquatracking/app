import vine from '@vinejs/vine'
import { BiotopeType } from '../constant.js'

export const biotopeCreateValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    description: vine.string().maxLength(1000).nullable(),
    startedDate: vine.date(),
    volume: vine.number().min(1).nullable(),
    type: vine.enum(BiotopeType),
    saltwater: vine.boolean().optional(),
  })
)
