import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { isCharacterData } from '../../dtos/sync';
import { CoreSkills } from '../../dtos/wildcards-consts';
import { computeParry, computeToughness } from '../armor-helpers';
import { foundryKind, foundryToCharacter, halfDie } from './actor';
import { SAMPLES_DIR as DIR, sample } from './samples.test-helper';

describe('foundryKind', () => {
  test('swade actor', async () => {
    expect(foundryKind(await sample('uther'))).toBe('swade');
  });

  test('actor from another system', () => {
    const actor = { _stats: { systemId: 'dnd5e' }, type: 'character', system: {}, items: [] };
    expect(foundryKind(actor)).toBe('other-system');
  });

  test('not a foundry actor', async () => {
    for (const value of [{}, [], null, 'x', { format: 'wild-cards-go' }]) {
      expect(foundryKind(value)).toBe('none');
    }
    expect(foundryKind({ ...(await sample('uther')), type: 'vehicle' })).toBe('none');
  });
});

describe('foundryToCharacter', () => {
  test('uther core stats', async () => {
    const c = foundryToCharacter(await sample('uther'));
    expect(c.name).toBe('Uther');
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
      rank: 'Novice',
      parry: 6,
      parryMod: 1,
      toughness: 6,
      toughnessMod: 0,
      pace: 6,
      runDie: 'd6',
      bennies: 3,
      wounds: 0,
      fatigue: 0,
      foundrySource: { worldId: 'the-fouling-stone', uuid: 'Actor.gXSQDfi8fjmw48Jm' },
    });
  });

  test('ancestry item sets race', async () => {
    expect(foundryToCharacter(await sample('colber-tarshin')).race).toBe('Human, Erenlander');
  });

  test('power points', async () => {
    const c = foundryToCharacter(await sample('elloviel'));
    expect(c).toMatchObject({ maxPowerPoints: 10, currentPowerPoints: 10 });
  });

  test('bio is plain text with archetype', async () => {
    const bio = foundryToCharacter(await sample('colber-tarshin')).bio ?? '';
    expect(bio.length).toBeGreaterThan(100);
    expect(bio).not.toMatch(/<|@UUID/);
    expect(bio).toContain('Archetype: Run and Gun');
  });

  test('every sample passes server validation', async () => {
    for (const file of readdirSync(DIR)) {
      const actor = JSON.parse(await Bun.file(`${DIR}/${file}`).text());
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
    const actor = await sample('uther');
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
    const actor = await sample('uther');
    actor.system.details = { ...actor.system.details, autoCalcParry: false };
    actor.system.stats = { ...actor.system.stats, parry: { value: 7, modifier: 0 } };
    expect(computeParry(foundryToCharacter(actor)).total).toBe(7);
  });
});

test('halfDie', () => {
  expect(halfDie(12, 2)).toBe(7);
  expect(halfDie(8, -1)).toBe(4);
});
