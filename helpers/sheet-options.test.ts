import { expect, test } from 'bun:test';
import { Trait } from '../dtos/Trait.dto';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { DiceValues } from '../dtos/wildcards-consts';
import { hasConviction, sheetOptionState } from './sheet-options';

const fresh = () => ({ ...new WildCardCharacter() });

test('new characters start with setting rules off', () => {
  expect(sheetOptionState(fresh(), 'conviction')).toEqual({ shown: false, inUse: false });
  expect(sheetOptionState(fresh(), 'customAttributes')).toEqual({ shown: false, inUse: false });
});

test('characters saved before options existed keep conviction visible', () => {
  const legacy = { ...fresh(), options: undefined };
  expect(sheetOptionState(legacy, 'conviction').shown).toBe(true);
  expect(sheetOptionState(legacy, 'customAttributes').shown).toBe(false);
});

test('an enabled option is shown', () => {
  const character = { ...fresh(), options: { conviction: true, customAttributes: true } };
  expect(sheetOptionState(character, 'conviction').shown).toBe(true);
  expect(sheetOptionState(character, 'customAttributes').shown).toBe(true);
});

test('data in use stays shown even with the option off', () => {
  const character = {
    ...fresh(),
    conviction: true,
    customAttributes: [new Trait('Sanity', DiceValues.d6)],
  };
  expect(sheetOptionState(character, 'conviction')).toEqual({ shown: true, inUse: true });
  expect(sheetOptionState(character, 'customAttributes')).toEqual({ shown: true, inUse: true });
});

test('an empty custom attribute list is not in use', () => {
  const character = { ...fresh(), customAttributes: [] };
  expect(sheetOptionState(character, 'customAttributes').inUse).toBe(false);
});

test('conviction stored as a legacy count counts when positive', () => {
  expect(hasConviction({ conviction: 2 as unknown as boolean })).toBe(true);
  expect(hasConviction({ conviction: 0 as unknown as boolean })).toBe(false);
  expect(hasConviction({ conviction: false })).toBe(false);
  expect(hasConviction({})).toBe(false);
});
