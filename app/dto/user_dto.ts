import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

const userDtoSchema = vine.object({
  id: vine.string(),
  fullName: vine.string(),
  email: vine.string(),
  verified: vine.boolean(),
  createdAt: vine.date(),
  updatedAt: vine.date(),
})

export const userDtoValidator = vine.compile(userDtoSchema)

export type UserDto = Infer<typeof userDtoSchema>
