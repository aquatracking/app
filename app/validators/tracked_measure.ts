import vine from '@vinejs/vine'

/**
 * Codes of the catalog entries still offered (MeasureTypeCatalog.offered),
 * given by the caller so that they follow the catalog in use.
 */
type Meta = { offeredCodes: string[] }

/**
 * A code absent from the catalog, or retired, is refused here. A type
 * already tracked is refused by TrackedMeasureService.
 */
export const addTrackedMeasureValidator = vine.withMetaData<Meta>().create({
  code: vine.enum((field) => (field.meta as Meta).offeredCodes),
})

/**
 * The ids of all the tracked measures of the vivarium, in their new order.
 */
export const reorderTrackedMeasuresValidator = vine.create({
  ids: vine.array(vine.string().uuid()).maxLength(100),
})
