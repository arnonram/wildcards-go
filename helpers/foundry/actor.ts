import { Trait } from '../../dtos/Trait.dto';
import { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { CoreSkills, DiceValues, Ranks, STEPPED_DICE } from '../../dtos/wildcards-consts';
import { mapItems } from './items';
import { foundryText } from './text';

interface FoundryDie {
  sides?: number;
  modifier?: number;
}

export interface FoundryItem {
  name?: string;
  type?: string;
  sort?: number;
  // biome-ignore lint/suspicious/noExplicitAny: shape varies per item type
  system?: Record<string, any>;
}

export interface FoundryActor {
  name?: string;
  type?: string;
  _stats?: { systemId?: string; exportSource?: { worldId?: string; uuid?: string } | null };
  // biome-ignore lint/suspicious/noExplicitAny: loosely typed SWADE system data
  system: Record<string, any>;
  items: FoundryItem[];
}

export type FoundryKind = 'swade' | 'other-system' | 'none';

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function foundryKind(json: unknown): FoundryKind {
  if (!isObject(json) || !isObject(json._stats) || typeof json._stats.systemId !== 'string') {
    return 'none';
  }
  if (!(json.type === 'character' || json.type === 'npc')) return 'none';
  if (!isObject(json.system) || !Array.isArray(json.items)) return 'none';
  return json._stats.systemId === 'swade' ? 'swade' : 'other-system';
}

/** SWADE "half the die": a positive modifier adds half of itself, rounded down. */
export function halfDie(sides: number, modifier = 0): number {
  return sides / 2 + (modifier > 0 ? Math.floor(modifier / 2) : 0);
}

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function dice(sides: unknown): DiceValues {
  const value = `d${sides}` as DiceValues;
  return STEPPED_DICE.includes(value) ? value : DiceValues.d4;
}

function trait(name: string, die: FoundryDie | undefined): Trait {
  const t = new Trait(name, dice(die?.sides));
  const mod = num(die?.modifier) ?? 0;
  if (mod !== 0) t.mod = mod > 0 ? `+${mod}` : `${mod}`;
  return t;
}

function bio(details: Record<string, unknown> | undefined): string | undefined {
  if (!details) return undefined;
  const lines = [
    foundryText((details.biography as { value?: unknown } | undefined)?.value),
    ...(['archetype', 'appearance', 'goals'] as const).map((key) => {
      const value = foundryText(details[key]);
      return value && `${key[0].toUpperCase()}${key.slice(1)}: ${value}`;
    }),
  ].filter(Boolean);
  return lines.length ? lines.join('\n\n') : undefined;
}

export function foundryToCharacter(actor: FoundryActor): WildCardCharacter {
  const system = actor.system ?? {};
  const details = system.details ?? {};
  const stats = system.stats ?? {};
  const items = actor.items ?? [];
  const c = new WildCardCharacter(str(actor.name) ?? '');

  c.attributes = c.attributes.map((a) =>
    trait(a.name, system.attributes?.[a.name.toLowerCase()]?.die),
  );

  const skillItems = items.filter(
    (i) => i.type === 'skill' && str(i.name) && i.name !== 'Unskilled',
  );
  const skills = skillItems.map((i) => trait(str(i.name) as string, i.system?.die));
  const missingCore = Object.values(CoreSkills)
    .filter((core) => !skills.some((s) => s.name === core))
    .map((core) => new Trait(core, DiceValues.d4));
  c.skills = [...missingCore, ...skills];

  const ancestry = items.find((i) => i.type === 'ancestry');
  c.race = str(ancestry?.name) ?? foundryText(details.species?.name);

  const rank = str(system.advances?.rank);
  c.rank = Object.values(Ranks).find((r) => r === rank) ?? Ranks.Novice;
  c.size = num(stats.size) ?? 0;
  c.pace = num(system.pace?.ground) ?? 6;
  c.runDie = dice(system.pace?.running?.die ?? 6);

  const fighting = items.find((i) => i.type === 'skill' && i.name === 'Fighting')?.system?.die;
  c.parry =
    details.autoCalcParry === false
      ? (num(stats.parry?.value) ?? 2)
      : 2 + (fighting ? halfDie(num(fighting.sides) ?? 4, num(fighting.modifier)) : 0);
  const vigor = system.attributes?.vigor?.die;
  c.toughness =
    details.autoCalcToughness === false
      ? (num(stats.toughness?.value) ?? 2)
      : 2 + (vigor ? halfDie(num(vigor.sides) ?? 4, num(vigor.modifier)) : 0);
  c.parryMod = num(stats.parry?.modifier) ?? 0;
  c.toughnessMod = num(stats.toughness?.modifier) ?? 0;

  c.wounds = num(system.wounds?.value) ?? 0;
  c.fatigue = num(system.fatigue?.value) ?? 0;
  c.bennies = num(system.bennies?.value);
  c.currentPowerPoints = num(system.powerPoints?.general?.value) ?? 0;
  c.maxPowerPoints = num(system.powerPoints?.general?.max) ?? 0;
  c.bio = bio(details);
  Object.assign(c, mapItems(items));

  const source = actor._stats?.exportSource;
  if (source?.worldId && source.uuid)
    c.foundrySource = { worldId: source.worldId, uuid: source.uuid };
  return c;
}
