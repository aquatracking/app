export const BiotopeType = ['aquarium', 'terrarium'] as const

export const MeasureTypes = [
  {
    code: 'temperature',
    recommendedBiotopes: ['aquarium', 'terrarium'],
    unit: '°C',
  },
  {
    code: 'humidity',
    recommendedBiotopes: ['terrarium'],
    unit: '%',
  },
  {
    code: 'luminosity',
    recommendedBiotopes: ['terrarium'],
    unit: 'lux',
  },
  {
    code: 'ph',
    recommendedBiotopes: ['aquarium'],
    unit: '',
  },
  {
    code: 'nitrite',
    recommendedBiotopes: ['aquarium'],
    unit: 'mg/L',
  },
  {
    code: 'nitrate',
    recommendedBiotopes: ['aquarium'],
    unit: 'mg/L',
  },
  {
    code: 'ammonia',
    recommendedBiotopes: ['aquarium'],
    unit: 'mg/L',
  },
  {
    code: 'gh',
    recommendedBiotopes: ['aquarium'],
    unit: '°GH',
  },
  {
    code: 'kh',
    recommendedBiotopes: ['aquarium'],
    unit: '°KH',
  },
] as const

export type MeasureType = (typeof MeasureTypes)[number]

export type MeasureTypeCode = MeasureType['code']
