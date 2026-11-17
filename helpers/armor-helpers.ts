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

/** True when the value is one of the stock locations, not custom text. */
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

/** Toughness before any armor, including Size and the character's Toughness Mod. */
export function baseToughness(character: WildCardCharacter): number {
  return (
    toNumber(character.toughness) + toNumber(character.toughnessMod) + toNumber(character.size)
  );
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

export interface ParryBreakdown {
  total: number;
  base: number;
  shield: number;
}

/** A hero uses one shield, so equipped shields don't stack: the best one counts. */
export function computeParry(character: WildCardCharacter): ParryBreakdown {
  const base = toNumber(character.parry) + toNumber(character.parryMod);
  const shield = Math.max(
    0,
    ...(character.armors ?? [])
      .filter((armor) => armor.isEquipped && armor.locations === ArmorLocations.Shield)
      .map((armor) => parseArmorBonus(armor.parry)),
  );
  return { total: base + shield, base, shield };
}

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;

/** The printed Bonus cell: armor bonus, or a shield's Parry and Cover. */
export function armorBonusText(
  armor: Armor,
  t: (key: 'stat.parry' | 'sheet.armor.cover') => string,
): string {
  const bonus = parseArmorBonus(armor.armorBonus);
  if (armor.locations !== ArmorLocations.Shield) return `+${bonus}`;
  return [
    armor.parry != null ? `${t('stat.parry')} ${signed(parseArmorBonus(armor.parry))}` : null,
    armor.cover != null
      ? `${t('sheet.armor.cover')} ${signed(parseArmorBonus(armor.cover))}`
      : null,
    bonus > 0 ? `+${bonus}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Shields keep their table bonus in `parry`, armor in `armorBonus`. Moving a
 * row across that line carries the number over so the column doesn't blank.
 */
export function locationChange(armor: Armor, location: string): Partial<Armor> {
  const wasShield = armor.locations === ArmorLocations.Shield;
  const isShield = location === ArmorLocations.Shield;
  if (wasShield === isShield) return { locations: location };
  return isShield
    ? { locations: location, parry: armor.armorBonus, armorBonus: undefined }
    : { locations: location, armorBonus: armor.parry, parry: undefined };
}
