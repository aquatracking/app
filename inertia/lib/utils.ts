import type { Updater } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T extends Updater<any>>(updaterOrValue: T, ref: Ref) {
  ref.value = typeof updaterOrValue === 'function' ? updaterOrValue(ref.value) : updaterOrValue
}

export function get365DaysAgo() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 365)

  return date
}

export function getAllDatesBetweenTwoDates(startDate: Date, endDate: Date) {
  const dates = []
  let currentDate = startDate

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  return dates
}
