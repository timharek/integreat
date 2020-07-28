import later = require('later')
import { ScheduleObject } from './types'

const nextDate = (dates: Date | Date[], allowNow: boolean) => {
  if (Array.isArray(dates) && dates[0]) {
    return allowNow || dates[0].getTime() > Date.now() ? dates[0] : dates[1]
  }
  return null
}

/**
 * Get next time for a schedule. Will never return the current time, even if it
 * is valid for the schedule, unless `allowNow` is true.
 * @param schedule - The schedule
 * @param allowNow - True to allow now as next Date
 * @returns The next Date
 */
export default function nextSchedule(
  schedule?: ScheduleObject | null,
  allowNow = false
): Date | null {
  if (schedule) {
    try {
      const dates = later.schedule(schedule).next(2)
      return nextDate(dates, allowNow)
    } catch (error) {
      throw TypeError('Invalid schedule definition')
    }
  }
  return null
}
