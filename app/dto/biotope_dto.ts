export type BiotopeDto = {
  id: string
  name: string
  description: string | null
  type: 'aquarium' | 'terrarium'
  volume: number | null
  startedDate: Date
  archivedDate: Date | null
  createdAt: Date
  updatedAt: Date
  userId: string
}
