import { describe, expect, test } from 'bun:test';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { DiceValues } from '../dtos/wildcards-consts';
import { runDie } from './run-die';

describe('runDie', () => {
  test('defaults to d6 for characters saved before run die existed', () => {
    const character = new WildCardCharacter('Old');
    delete character.runDie;
    expect(runDie(character)).toBe(DiceValues.d6);
  });

  test('returns the stored die', () => {
    const character = new WildCardCharacter('Fleet');
    character.runDie = DiceValues.d8;
    expect(runDie(character)).toBe(DiceValues.d8);
  });

  test('falls back to d6 for an unknown value', () => {
    const character = new WildCardCharacter('Odd');
    character.runDie = 'd7' as DiceValues;
    expect(runDie(character)).toBe(DiceValues.d6);
  });
});
