import { z } from 'zod';

/**
 * Parses data against a Zod schema and throws an error if validation fails.
 * @param data The data to validate.
 * @param schema The Zod schema to validate against.
 * @returns The parsed data.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Generates a class ID based on grade and index.
 * @param grade The grade number (e.g., 8).
 * @param index The class index (e.g., 3).
 * @returns The formatted class ID (e.g., "class_8_3").
 */
export function generateClassId(grade: number, index: number): string {
  return `class_${grade}_${index}`;
}
