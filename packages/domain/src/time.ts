import { getWeek } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

/**
 * A generic type for server timestamps.
 * This should be replaced with the actual server timestamp object from your database provider (e.g., Firebase).
 */
export type ServerTimestamp = any; // Replace 'any' with your actual server timestamp type

/**
 * Returns a server timestamp value.
 * In a real application, this would return a server-specific timestamp object.
 * For example, in Firebase, it would be `FieldValue.serverTimestamp()`.
 */
export function serverTimestamp(): ServerTimestamp {
  // This is a placeholder. In a real application, you would use the
  // actual server timestamp object provided by your database.
  return new Date();
}

/**
 * Gets the week of the year for a given date in the Asia/Ho_Chi_Minh timezone.
 *
 * @param date The date to get the week of.
 * @returns The week of the year.
 */
export function weekOf(date: Date): number {
  const timeZone = 'Asia/Ho_Chi_Minh';
  const zonedDate = utcToZonedTime(date, timeZone);
  return getWeek(zonedDate, { weekStartsOn: 1 }); // Assuming week starts on Monday
}
