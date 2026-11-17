import { describe, expect, test } from 'bun:test';
import { computeParry, computeToughness } from '../armor-helpers';
import { foundryToCharacter } from './actor';
import { testHero } from './fixtures.test-helper';
import { mapItems } from './items';

const byName = <T extends { name: string }>(list: T[] | undefined, name: string) =>
  list?.find((item) => item.name === name);

describe('items', () => {
  const c = foundryToCharacter(testHero());

  test('edges with requirements and plain description', () => {
    const ironJaw = byName(c.edges, 'Iron Jaw');
    expect(ironJaw).toMatchObject({ requirements: 'Novice, Vigor d8+', edgeType: undefined });
    expect(ironJaw?.description).toContain('Soak rolls');
    expect(ironJaw?.description).not.toContain('@UUID');
    expect(byName(c.edges, 'Block')).toMatchObject({
      edgeType: 'Combat',
      requirements: 'Seasoned, Fighting d8+',
    });
  });

  test('abilities become edges of type Ability', () => {
    expect(c.edges?.filter((e) => e.edgeType === 'Ability')).toHaveLength(1);
    expect(byName(c.edges, 'Infravision')?.edgeType).toBe('Ability');
  });

  test('hindrances', () => {
    expect(byName(c.hindrances, 'Vengeful')?.isMajor).toBe(true);
    expect(byName(c.hindrances, 'Loyal')?.isMajor).toBe(false);
  });

  test('armor', () => {
    expect(byName(c.armors, 'Cap')).toMatchObject({
      locations: 'Head',
      armorBonus: 2,
      isEquipped: true,
    });
    const jacket = byName(c.armors, 'Jacket');
    expect(jacket).toMatchObject({ locations: 'Torso', isEquipped: true });
    expect(jacket?.comments).toContain('Arms');
    expect(byName(c.armors, 'Chain Shirt')).toMatchObject({
      isEquipped: false,
      armorBonus: 3,
    });
  });

  test('shield', () => {
    expect(byName(c.armors, 'Medium Shield')).toMatchObject({
      locations: 'Shield',
      parry: 2,
      cover: -2,
      isEquipped: true,
      weight: 8,
      cost: 100,
    });
  });

  test('derived parry and toughness armor', () => {
    expect(computeParry(c).total).toBe(9);
    expect(computeToughness(c).armor).toBe(2);
  });

  test('weapons', () => {
    expect(c.weapons).toHaveLength(2);
    expect(byName(c.weapons, 'Club')).toMatchObject({
      damage: 'Str+d4',
      range: '3/6/12',
      minStr: 'd4',
      ap: undefined,
    });
  });

  test('gear and consumables, quantity in the name', () => {
    expect(c.gear).toHaveLength(3);
    expect(byName(c.gear, 'Sling stones ×17')).toBeDefined();
    expect(byName(c.gear, 'Dried Herbs ×3')).toBeDefined();
    expect(byName(c.gear, 'Backpack')).toMatchObject({ weight: 2, cost: 50 });
  });
});

describe('powers', () => {
  test('duration kept as text, trapping in comments', async () => {
    const healing = byName(foundryToCharacter(testHero()).powers, 'Healing');
    expect(healing).toMatchObject({ pp: '3', range: 'Touch', duration: 'Instant' });
    expect(healing?.comments).toBe('Trapping: Laying on hands');
  });

  test('numeric duration kept as text too', async () => {
    const barrier = byName(foundryToCharacter(testHero()).powers, 'Barrier');
    expect(barrier?.duration).toBe('5');
  });
});

test('unknown and action items ignored; no items gives empty lists', () => {
  expect(
    mapItems([
      { type: 'action', name: 'Attack' },
      { type: 'mystery', name: 'X' },
    ]),
  ).toEqual({
    edges: [],
    hindrances: [],
    powers: [],
    weapons: [],
    armors: [],
    gear: [],
  });
});
