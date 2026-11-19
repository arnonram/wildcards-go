import { Armor } from '../../dtos/Armor.dto';
import { Edge } from '../../dtos/Edge';
import { Gear } from '../../dtos/Gear.dto';
import { Hindrance } from '../../dtos/Hindrance.dto';
import { Power } from '../../dtos/Power.dto';
import { Weapon } from '../../dtos/Weapon.dto';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { ArmorLocations, Ranks } from '../../dtos/wildcards-consts';
import type { FoundryItem } from './actor';
import { foundryDamage, foundryText } from './text';
import { fromSwid, nonZero, num, str as text } from './values';

type Mapped = Required<
  Pick<WildCardCharacter, 'edges' | 'hindrances' | 'powers' | 'weapons' | 'armors' | 'gear'>
>;

const lines = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('\n') || undefined;

const RANKS = Object.values(Ranks);
// Most protective first: Torso is what feeds Toughness.
const LOCATIONS = [
  ['torso', ArmorLocations.Torso],
  ['head', ArmorLocations.Head],
  ['arms', ArmorLocations.Arms],
  ['legs', ArmorLocations.Legs],
] as const;

// biome-ignore lint/suspicious/noExplicitAny: SWADE requirement entries vary by type
function requirement(r: any): string | undefined {
  const label = text(r?.label);
  const selector = text(r?.selector);
  switch (r?.type) {
    case 'rank':
      return RANKS[r.value];
    case 'wildCard':
      return r.value === false ? undefined : 'Wild Card';
    case 'attribute':
    case 'skill': {
      const name = label ?? (selector && fromSwid(selector));
      return name && (r.value ? `${name} d${r.value}+` : name);
    }
    default:
      return label;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: loosely typed SWADE item data
const isMajor = (s: any) =>
  s?.severity === 'major' || (s?.severity !== 'minor' && s?.major === true);

function requirements(list: unknown): string | undefined {
  if (!Array.isArray(list)) return undefined;
  const parts = list.map(requirement).filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function edge(item: FoundryItem, name: string, edgeType?: string): Edge {
  const e = new Edge(name);
  e.edgeType = edgeType;
  e.requirements = requirements(item.system?.requirements);
  e.description = foundryText(item.system?.description);
  return e;
}

function armor(item: FoundryItem, name: string): Armor {
  const s = item.system ?? {};
  const a = new Armor(name);
  a.isEquipped = (s.equipStatus ?? 0) >= 2;
  a.weight = nonZero(s.weight);
  a.cost = nonZero(s.price);
  const description = foundryText(s.description);
  if (item.type === 'shield') {
    a.locations = ArmorLocations.Shield;
    a.parry = nonZero(s.parry);
    a.cover = nonZero(s.cover);
    a.armorBonus = nonZero(s.armor) ?? 0;
    a.comments = description;
    return a;
  }
  const covered = LOCATIONS.filter(([key]) => s.locations?.[key]).map(([, location]) => location);
  a.locations = covered[0] ?? ArmorLocations.Torso;
  a.armorBonus = nonZero(s.armor) ?? 0;
  const others = covered.slice(1);
  a.comments = lines(others.length ? `Also covers: ${others.join(', ')}` : undefined, description);
  return a;
}

function power(item: FoundryItem, name: string): Power {
  const s = item.system ?? {};
  const p = new Power(name);
  p.pp = s.pp === undefined || s.pp === null || s.pp === '' ? undefined : String(s.pp);
  p.range = text(s.range);
  p.duration = text(s.duration);
  p.effect = foundryText(s.description);
  p.comments = text(s.trapping) && `Trapping: ${text(s.trapping)}`;
  return p;
}

/** Foundry keeps one row per stack; here the row carries the stack's totals. */
function stack(item: FoundryItem, name: string) {
  const s = item.system ?? {};
  const quantity = num(s.quantity) ?? 1;
  const total = (value: unknown) => {
    const n = nonZero(value);
    return n === undefined || quantity === 0 ? undefined : Math.round(n * quantity * 100) / 100;
  };
  return { name: quantity === 1 ? name : `${name} ×${quantity}`, total };
}

function weapon(item: FoundryItem, name: string): Weapon {
  const s = item.system ?? {};
  const { name: label, total } = stack(item, name);
  const w = new Weapon(label);
  w.range = text(s.range);
  w.damage = foundryDamage(s.damage);
  w.ap = nonZero(s.ap);
  w.rof = nonZero(s.rof);
  w.shots = nonZero(s.shots);
  w.minStr = text(s.minStr);
  w.weight = total(s.weight);
  w.comments = foundryText(s.description);
  return w;
}

function gear(item: FoundryItem, name: string): Gear {
  const s = item.system ?? {};
  const { name: label, total } = stack(item, name);
  return new Gear(label, total(s.weight), total(s.price), foundryText(s.description));
}

export function mapItems(items: FoundryItem[]): Mapped {
  const mapped: Mapped = {
    edges: [],
    hindrances: [],
    powers: [],
    weapons: [],
    armors: [],
    gear: [],
  };
  const sorted = [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  for (const item of sorted) {
    const name = text(item.name);
    if (!name) continue;
    switch (item.type) {
      case 'edge':
        mapped.edges.push(edge(item, name, text(item.system?.category)));
        break;
      case 'ability':
        mapped.edges.push(edge(item, name, 'Ability'));
        break;
      case 'hindrance':
        mapped.hindrances.push(
          new Hindrance(name, isMajor(item.system), foundryText(item.system?.description)),
        );
        break;
      case 'power':
        mapped.powers.push(power(item, name));
        break;
      case 'weapon':
        mapped.weapons.push(weapon(item, name));
        break;
      case 'armor':
      case 'shield':
        mapped.armors.push(armor(item, name));
        break;
      case 'gear':
      case 'consumable':
        mapped.gear.push(gear(item, name));
        break;
    }
  }
  return mapped;
}
