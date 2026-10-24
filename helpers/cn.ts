type ClassValue = string | false | null | undefined;

/**
 * Joins conditional class names. Deliberately tiny: the design system owns its
 * class strings, so there is no need for conflict resolution here.
 */
export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ');
}
