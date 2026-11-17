import { describe, expect, test } from 'bun:test';
import { Armor } from '../dtos/Armor.dto';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { ArmorLocations } from '../dtos/wildcards-consts';
import { armorBonusText, computeParry, computeToughness } from './armor-helpers';

function shield(parry: unknown, isEquipped = true): Armor {
  const armor = new Armor('Shield');
  armor.locations = ArmorLocations.Shield;
  armor.parry = parry as number;
  armor.isEquipped = isEquipped;
  return armor;
}

function character(armors: Armor[] = []): WildCardCharacter {
  const c = new WildCardCharacter('x');
  c.parry = 5;
  c.parryMod = 1;
  c.armors = armors;
  return c;
}

describe('computeParry', () => {
  test('no shields', () => {
    expect(computeParry(character())).toEqual({ total: 6, base: 6, shield: 0 });
  });

  test('equipped shield adds its parry', () => {
    expect(computeParry(character([shield(2)]))).toEqual({ total: 8, base: 6, shield: 2 });
  });

  test('unequipped shield adds nothing', () => {
    expect(computeParry(character([shield(2, false)])).shield).toBe(0);
  });

  test('two equipped shields: only the highest counts', () => {
    expect(computeParry(character([shield(1), shield(3)])).shield).toBe(3);
  });

  test('parry stored as "+2" text', () => {
    expect(computeParry(character([shield('+2')])).shield).toBe(2);
  });

  test('shield row without parry adds nothing', () => {
    expect(computeParry(character([shield(undefined)])).shield).toBe(0);
  });

  test('parry and parryMod stored as text', () => {
    const c = character();
    c.parry = '5' as unknown as number;
    c.parryMod = '1' as unknown as number;
    expect(computeParry(c).base).toBe(6);
  });
});

test('shield armor bonus never adds to Toughness', () => {
  const armor = shield(2);
  armor.armorBonus = 2;
  expect(computeToughness(character([armor])).armor).toBe(0);
});

describe('armorBonusText', () => {
  const t = (key: string) => ({ 'stat.parry': 'Parry', 'sheet.armor.cover': 'Cover' })[key] ?? key;

  test('armor row', () => {
    const armor = new Armor('Jacket');
    armor.armorBonus = 2;
    expect(armorBonusText(armor, t)).toBe('+2');
  });

  test('shield with parry and cover', () => {
    const armor = shield(2);
    armor.cover = -2;
    expect(armorBonusText(armor, t)).toBe('Parry +2 · Cover −2');
  });

  test('positive cover keeps its sign', () => {
    const armor = shield(1);
    armor.cover = 2;
    expect(armorBonusText(armor, t)).toBe('Parry +1 · Cover +2');
  });

  test('shield without parry prints no parry', () => {
    expect(armorBonusText(shield(undefined), t)).toBe('');
  });

  test('negative parry prints one sign', () => {
    expect(armorBonusText(shield(-1), t)).toBe('Parry −1');
  });

  test('shield armor bonus appended', () => {
    const armor = shield(2);
    armor.armorBonus = 1;
    expect(armorBonusText(armor, t)).toBe('Parry +2 · +1');
  });
});
