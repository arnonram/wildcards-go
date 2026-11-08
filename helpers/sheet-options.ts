import type { SheetOptions, WildCardCharacter } from '../dtos/WildCardCharacter.dto';

export type SheetOption = keyof SheetOptions;

export const SHEET_OPTIONS: readonly SheetOption[] = ['conviction', 'customAttributes'];

export function hasConviction(character: Pick<WildCardCharacter, 'conviction'>): boolean {
  return character.conviction === true || Number(character.conviction) > 0;
}

function inUse(character: WildCardCharacter, option: SheetOption): boolean {
  return option === 'conviction'
    ? hasConviction(character)
    : (character.customAttributes?.length ?? 0) > 0;
}

/**
 * Data in use is never hidden. Characters saved before options existed have
 * no `options` and showed conviction, so they keep it.
 */
export function sheetOptionState(character: WildCardCharacter, option: SheetOption) {
  const used = inUse(character, option);
  const enabled = character.options ? character.options[option] === true : option === 'conviction';
  return { shown: used || enabled, inUse: used };
}
