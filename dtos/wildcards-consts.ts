export enum Attributes {
  Agility = 'Agility',
  Smarts = 'Smarts',
  Spirit = 'Spirit',
  Strength = 'Strength',
  Vigor = 'Vigor',
}

export enum CoreSkills {
  Athletics = 'Athletics',
  CommonKnowlegde = 'Common Knowledge',
  Notice = 'Notice',
  Persuasion = 'Persuasion',
  Stealth = 'Stealth',
}

/**
 * Savage Worlds damage locations. Armor covering a location adds its bonus
 * when the wearer is struck there.
 */
export enum ArmorLocations {
  Head = 'Head',
  Torso = 'Torso',
  Arms = 'Arms',
  Legs = 'Legs',
}

/**
 * Savage Worlds die steps. Lives here (rather than in a component) so DTOs can
 * reference it without depending on the UI layer.
 */
export enum DiceValues {
  untrained = 'd4-2',
  d4 = 'd4',
  d6 = 'd6',
  d8 = 'd8',
  d10 = 'd10',
  d12 = 'd12',
}

export const STEPPED_DICE = [
  DiceValues.d4,
  DiceValues.d6,
  DiceValues.d8,
  DiceValues.d10,
  DiceValues.d12,
];

export enum Ranks {
  Novice = 'Novice',
  Seasoned = 'Seasoned',
  Veteran = 'Veteran',
  Heroic = 'Heroic',
  Legendary = 'Legendary',
}
