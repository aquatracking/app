import { test } from '@japa/runner'
import Vivarium from '#models/vivarium'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'

test.group('Vivariums in the administration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('vivariums')
    return () => drive.restore('vivariums')
  })

  test('VIV-13 deleting a user deletes their vivariums and image files', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    const disk = drive.use('vivariums')
    const [first, second] = await VivariumFactory.merge({ userId: user.id }).createMany(2)
    const kept = await VivariumFactory.merge({ userId: other.id }).create()
    for (const vivarium of [first, second, kept]) {
      vivarium.imagePath = `${vivarium.id}/image.webp`
      await disk.put(vivarium.imagePath, 'image')
      await vivarium.save()
    }

    const response = await client
      .delete(`/admin/users/${user.id}`)
      .withInertia()
      .header('referer', '/admin/users')
      .form({ email: user.email })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertHeader('location', '/admin/users')
    assert.isNull(await Vivarium.find(first.id))
    assert.isNull(await Vivarium.find(second.id))
    assert.isFalse(await disk.exists(first.imagePath!))
    assert.isFalse(await disk.exists(second.imagePath!))
    assert.isNotNull(await Vivarium.find(kept.id))
    assert.isTrue(await disk.exists(kept.imagePath!))
  })

  test('VIV-13 the list of users shows the number of vivariums of each, in one query', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.merge({ isAdmin: true }).create()
    const users = await UserFactory.createMany(3)
    await VivariumFactory.merge({ userId: users[0].id }).createMany(2)
    await VivariumFactory.merge({ userId: users[1].id, name: 'Secret reef' }).create()

    let vivariumQueries = 0
    const countQueries = (query: { sql: string }) => {
      if (query.sql.includes('"vivariums"')) vivariumQueries++
    }
    db.connection().getWriteClient().on('query', countQueries)
    const response = await client.get('/admin/users').withInertia().loginAs(admin)
    db.connection().getWriteClient().off('query', countQueries)

    const rows = (response.inertiaProps as { users: { id: string; vivariumsCount: number }[] })
      .users
    const counts = Object.fromEntries(rows.map((row) => [row.id, row.vivariumsCount]))
    assert.deepEqual(counts, {
      [admin.id]: 0,
      [users[0].id]: 2,
      [users[1].id]: 1,
      [users[2].id]: 0,
    })
    assert.equal(vivariumQueries, 1)
    assert.notInclude(JSON.stringify(response.inertiaProps), 'Secret reef')
  })
})
