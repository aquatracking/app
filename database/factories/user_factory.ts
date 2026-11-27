import User from '#models/user'
import factory from '@adonisjs/lucid/factories'

/**
 * Users of the tests. Their password is "secret-password".
 */
export const UserFactory = factory
  .define(User, ({ faker }) => {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: 'secret-password',
      locale: 'en' as const,
      timezone: 'UTC',
    }
  })
  .build()
