import { describe, expect, test } from 'bun:test';
import { isCharacterData } from '../../dtos/sync';
import { CoreSkills } from '../../dtos/wildcards-consts';
import { computeParry, computeToughness } from '../armor-helpers';
import { foundryKind, foundryToCharacter, halfDie } from './actor';
import { localSamples, testHero } from './fixtures.test-helper';

describe('foundryKind', () => {
  test('swade actor', async () => {
    expect(foundryKind(testHero())).toBe('swade');
  });

  test('actor from another system', () => {
    const actor = { _stats: { systemId: 'dnd5e' }, type: 'character', system: {}, items: [] };
    expect(foundryKind(actor)).toBe('other-system');
  });

  test('not a foundry actor', async () => {
    for (const value of [{}, [], null, 'x', { format: 'wild-cards-go' }]) {
      expect(foundryKind(value)).toBe('none');
    }
    expect(foundryKind({ ...testHero(), type: 'vehicle' })).toBe('none');
  });
});

describe('foundryToCharacter', () => {
  test('core stats', async () => {
    const c = foundryToCharacter(testHero());
    expect(c.name).toBe('Test Hero');
    expect(c.attributes.map((a) => [a.name, a.dice])).toEqual([
      ['Agility', 'd8'],
      ['Smarts', 'd8'],
      ['Spirit', 'd4'],
      ['Strength', 'd10'],
      ['Vigor', 'd8'],
    ]);
    expect(c.skills.find((s) => s.name === 'Notice')).toMatchObject({ dice: 'd6', mod: '-1' });
    expect(c.skills.find((s) => s.name === 'Fighting')).toMatchObject({
      dice: 'd8',
      mod: undefined,
    });
    expect(c.skills.some((s) => s.name === 'Unskilled')).toBe(false);
    for (const core of Object.values(CoreSkills)) {
      expect(c.skills.filter((s) => s.name === core)).toHaveLength(1);
    }
    expect(c).toMatchObject({
      race: 'Orcs',
      rank: 'Seasoned',
      parry: 6,
      parryMod: 1,
      toughness: 6,
      toughnessMod: 0,
      pace: 6,
      runDie: 'd6',
      bennies: 3,
      wounds: 1,
      fatigue: 0,
      foundrySource: { worldId: 'test-world', uuid: 'Actor.testHero00000001' },
    });
  });

  test('ancestry item sets race', async () => {
    const actor = testHero();
    actor.items.push({ type: 'ancestry', name: 'Human, Erenlander' });
    expect(foundryToCharacter(actor).race).toBe('Human, Erenlander');
  });

  test('power points', async () => {
    const c = foundryToCharacter(testHero());
    expect(c).toMatchObject({ maxPowerPoints: 10, currentPowerPoints: 10 });
  });

  test('bio is plain text with archetype', async () => {
    const bio = foundryToCharacter(testHero()).bio ?? '';
    expect(bio).toContain('Raised in the wolf’s den — “tough” ’nuff.\nKnows Soak rolls…');
    expect(bio).not.toMatch(/<|@UUID/);
    expect(bio).toContain('Archetype: Herbalist');
  });

  test('fixture and local samples pass server validation', async () => {
    for (const actor of [testHero(), ...(await localSamples())]) {
      expect(isCharacterData(foundryToCharacter(actor))).toBe(true);
    }
  });

  test('minimal actor imports with defaults', () => {
    const c = foundryToCharacter({
      name: 'M',
      type: 'npc',
      _stats: { systemId: 'swade' },
      system: { attributes: {} },
      items: [],
    });
    expect(c.attributes.every((a) => a.dice === 'd4')).toBe(true);
    expect(c).toMatchObject({ parry: 2, toughness: 2 });
    expect(c.foundrySource).toBeUndefined();
  });

  test('manual toughness and parry totals are kept, not added to again', async () => {
    const actor = testHero();
    actor.system.details = {
      ...actor.system.details,
      autoCalcParry: false,
      autoCalcToughness: false,
    };
    actor.system.stats = {
      ...actor.system.stats,
      size: 1,
      toughness: { value: 10, armor: 2, modifier: 1 },
      parry: { value: 9, modifier: 1, shield: 2 },
    };
    const c = foundryToCharacter(actor);
    expect(computeToughness(c).total).toBe(10);
    expect(computeParry(c).total).toBe(9);
  });

  test('stored parry used when auto-calc is off', async () => {
    const actor = testHero();
    actor.system.details = { ...actor.system.details, autoCalcParry: false };
    actor.system.stats = { ...actor.system.stats, parry: { value: 7, modifier: 0 } };
    expect(computeParry(foundryToCharacter(actor)).total).toBe(7);
  });
});

test('halfDie', () => {
  expect(halfDie(12, 2)).toBe(7);
  expect(halfDie(8, -1)).toBe(4);
});
