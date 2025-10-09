import { ulid } from 'ulid';

/**
 * Generates a Universally Unique Lexicographically Sortable Identifier (ULID).
 *
 * @returns A new ULID string.
 */
export function generateId(): string {
  return ulid();
}
