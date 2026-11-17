import { expect, test } from 'bun:test';
import { Edge } from '../dtos/Edge';
import { Hindrance } from '../dtos/Hindrance.dto';
import { Power } from '../dtos/Power.dto';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { hasReference, referenceSections } from './print-reference';

const t = (key: string) =>
  ({ 'sheet.hindrances.major': 'Major', 'sheet.powers.pp': 'PP' })[key] ?? key;

function character(): WildCardCharacter {
  const c = new WildCardCharacter('x');
  c.hindrances = [
    new Hindrance('Loyal', false, 'Never leaves a friend'),
    new Hindrance('Vengeful', true, 'Gets even'),
  ];
  const plain = new Edge('Block');
  const described = new Edge('Iron Jaw');
  described.description = 'Soak +2';
  c.edges = [plain, described];
  const healing = new Power('Healing');
  healing.pp = '3';
  healing.range = 'Touch';
  healing.duration = 'Instant';
  healing.effect = 'Heals a wound';
  const bare = new Power('Bolt');
  bare.pp = '1';
  c.powers = [healing, bare];
  c.bio = '  Born in the north.  ';
  return c;
}

test('only entries with text, major flagged', () => {
  const sections = referenceSections(character(), t);
  expect(sections.hindrances).toEqual([
    { name: 'Loyal', text: 'Never leaves a friend' },
    { name: 'Vengeful', meta: 'Major', text: 'Gets even' },
  ]);
  expect(sections.edges).toEqual([{ name: 'Iron Jaw', text: 'Soak +2' }]);
});

test('power meta joins the parts that are set', () => {
  const powers = referenceSections(character(), t).powers;
  expect(powers).toEqual([
    { name: 'Healing', meta: 'PP 3 · Touch · Instant', text: 'Heals a wound' },
  ]);
});

test('power meta skips missing parts', () => {
  const c = character();
  const power = new Power('Light');
  power.effect = 'Glows';
  power.duration = 10;
  c.powers = [power];
  expect(referenceSections(c, t).powers).toEqual([{ name: 'Light', meta: '10', text: 'Glows' }]);
});

test('bio trimmed', () => {
  expect(referenceSections(character(), t).bio).toBe('Born in the north.');
});

test('hasReference', () => {
  expect(hasReference(character(), t)).toBe(true);
  expect(hasReference(new WildCardCharacter('fresh'), t)).toBe(false);
});
