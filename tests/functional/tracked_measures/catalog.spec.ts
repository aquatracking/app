import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
import MeasureType from '#models/measure_type'
import testUtils from '@adonisjs/core/services/test_utils'
import CatalogSeeder from '#database/seeders/catalog_seeder'
import { UserFactory } from '#database/factories/user_factory'
import { VivariumFactory } from '#database/factories/vivarium_factory'
import { TrackedMeasureService } from '#services/tracked_measure_service'
import {
  CLIMATES,
  VIVARIUM_KINDS,
  WATER_TYPES,
  hasClimate,
  hasWaterType,
  type VivariumProfile,
} from '#models/vivarium'
import {
  MEASURE_TYPES,
  MeasureTypeCatalog,
  type MeasureTypeDefinition,
} from '#catalog/measure_types'

function runSeeder() {
  return new CatalogSeeder(db.connection()).run()
}

/**
 * Runs the rest of the test with another catalog than the one of the code.
 */
function useCatalog(entries: MeasureTypeDefinition[]) {
  app.container.swap(MeasureTypeCatalog, () => new MeasureTypeCatalog(entries))
}

async function storedTypes() {
  const rows = await MeasureType.query().orderBy('position', 'asc')
  return rows.map(({ code, unit, decimals, position }) => ({ code, unit, decimals, position }))
}

/**
 * Every possible profile of a vivarium.
 */
function allProfiles(): VivariumProfile[] {
  return VIVARIUM_KINDS.flatMap((kind) =>
    (hasWaterType(kind) ? WATER_TYPES : [null]).flatMap((waterType) =>
      (hasClimate(kind) ? CLIMATES : [null]).map((climate) => ({ kind, waterType, climate }))
    )
  )
}

test.group('Measure type catalog', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => app.container.restore(MeasureTypeCatalog))

  test('TRK-1 on an empty table the seeder inserts every code of the catalog, without duplicate when run again', async ({
    assert,
  }) => {
    await MeasureType.query().delete()

    await runSeeder()
    await runSeeder()

    assert.deepEqual(
      await storedTypes(),
      MEASURE_TYPES.map(({ code, unit, decimals }, position) => ({
        code,
        unit,
        decimals,
        position,
      }))
    )
  })

  test('TRK-2 changing the unit, decimals or order of a type in the catalog updates the table', async ({
    assert,
  }) => {
    const before = await MeasureType.findByOrFail('code', 'temperature')
    const [temperatureEntry, phEntry, ...others] = MEASURE_TYPES
    useCatalog([phEntry, { ...temperatureEntry, unit: '°F', decimals: 0 }, ...others])

    await runSeeder()

    const after = await MeasureType.findByOrFail('code', 'temperature')
    assert.equal(after.id, before.id)
    assert.equal(after.unit, '°F')
    assert.equal(after.decimals, 0)
    assert.equal(after.position, 1)
    const ph = await MeasureType.findByOrFail('code', 'ph')
    assert.equal(ph.position, 0)
    assert.lengthOf(await MeasureType.all(), MEASURE_TYPES.length)
  })

  test('TRK-3 a retired type keeps its row', async ({ assert }) => {
    useCatalog(MEASURE_TYPES.map((entry) => ({ ...entry, retired: entry.code === 'fe' })))

    await runSeeder()

    assert.isNotNull(await MeasureType.findBy('code', 'fe'))
    assert.lengthOf(await MeasureType.all(), MEASURE_TYPES.length)
  })

  test('TRK-3 a code of the table missing from the catalog makes the seeder fail without changes', async ({
    assert,
  }) => {
    useCatalog(
      MEASURE_TYPES.filter((entry) => entry.code !== 'illuminance').map((entry) =>
        entry.code === 'temperature' ? { ...entry, unit: '°F' } : entry
      )
    )

    await assert.rejects(runSeeder, /illuminance.*missing from app\/catalog\/measure_types\.ts/)

    assert.isNotNull(await MeasureType.findBy('code', 'illuminance'))
    const temperature = await MeasureType.findByOrFail('code', 'temperature')
    assert.equal(temperature.unit, '°C')
  })

  test('TRK-3 a code missing from the catalog fails the seeder even when it is tracked', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const vivarium = await VivariumFactory.merge({ userId: user.id }).create()
    const service = await app.container.make(TrackedMeasureService)
    await service.add(vivarium, 'co2')
    useCatalog(MEASURE_TYPES.filter((entry) => entry.code !== 'co2'))

    await assert.rejects(runSeeder, /co2/)
  })

  test('TRK-11 the specific gravity type exists but no profile tracks it by default', async ({
    assert,
  }) => {
    const catalog = new MeasureTypeCatalog()

    assert.isNotNull(await MeasureType.findBy('code', 'specific_gravity'))
    for (const profile of allProfiles()) {
      const codes = catalog.defaultsFor(profile).map((entry) => entry.code)
      assert.notInclude(codes, 'specific_gravity', JSON.stringify(profile))
    }
  })
})
