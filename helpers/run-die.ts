import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { DiceValues, STEPPED_DICE } from '../dtos/wildcards-consts';

/** Characters saved before run die existed have none stored; Savage Worlds' default is d6. */
export function runDie(character: WildCardCharacter): DiceValues {
  const stored = character.runDie;
  return stored && STEPPED_DICE.includes(stored) ? stored : DiceValues.d6;
}
