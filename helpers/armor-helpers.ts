import type { Armor } from '../dtos/Armor.dto';
import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { ArmorLocations } from '../dtos/wildcards-consts';

/**
 * Armor bonuses were stored as free text before this became numeric.
 * Accepts "2", "+3", "" or undefined and always returns a finite number.
 */
export function parseArmorBonus(value: unknown): number {
  const raw = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** True when the value is one of the four core locations, not custom text. */
export function isArmorLocationKnown(location?: string): location is ArmorLocations {
  return Object.values(ArmorLocations).includes(location as ArmorLocations);
}

/**
 * Armor bonus granted at a location by the equipped pieces covering it.
 *
 * Overlapping armor uses the rule of halves rather than stacking outright:
 * the heaviest piece counts in full, and each additional piece covering the
 * same location contributes half its bonus, rounded down.
 */
export function armorBonusForLocation(
  armors: Armor[] | undefined,
  location: ArmorLocations,
): number {
  const bonuses = (armors ?? [])
    .filter((armor) => armor.isEquipped && armor.locations === location)
    .map((armor) => parseArmorBonus(armor.armorBonus))
    .sort((a, b) => b - a);

  if (bonuses.length === 0) {
    return 0;
  }

  const [heaviest, ...lighter] = bonuses;
  return lighter.reduce((total, bonus) => total + Math.floor(bonus / 2), heaviest);
}

/**
 * Numeric fields are written from text inputs, so they reach us as strings
 * even though the DTO types them as numbers. Coerce before any arithmetic or
 * `+` silently concatenates instead of adding.
 */
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Toughness before any armor, including the character's Toughness Mod. */
export function baseToughness(character: WildCardCharacter): number {
  return toNumber(character.toughness) + toNumber(character.toughnessMod);
}

/** Only torso armor contributes to Toughness. */
export function armorToughnessBonus(character: WildCardCharacter): number {
  return armorBonusForLocation(character.armors, ArmorLocations.Torso);
}

export interface ToughnessBreakdown {
  total: number;
  base: number;
  armor: number;
}

export function computeToughness(character: WildCardCharacter): ToughnessBreakdown {
  const base = baseToughness(character);
  const armor = armorToughnessBonus(character);
  return { total: base + armor, base, armor };
}
