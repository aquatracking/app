import vine from '@vinejs/vine'

export const userInviteValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)
