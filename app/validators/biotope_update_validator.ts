import vine from '@vinejs/vine'

export const biotopeUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    description: vine.string().maxLength(1000).nullable(),
    volume: vine.number().min(1).nullable(),
    saltwater: vine.boolean().optional(),
  })
)
