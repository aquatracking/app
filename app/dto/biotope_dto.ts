export type BiotopeDto = {
  id: string
  name: string
  description: string | null
  volume: number | null
  startedDate: Date
  archivedDate: Date | null
  createdAt: Date
  updatedAt: Date
  userId: string
} & (
  | {
      type: 'aquarium'
      saltwater: boolean
    }
  | {
      type: 'terrarium'
    }
)
