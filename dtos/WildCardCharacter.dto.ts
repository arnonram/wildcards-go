import type { Armor } from './Armor.dto';
import { BaseEntity } from './BaseEntity.dto';
import type { Edge } from './Edge';
import type { Gear } from './Gear.dto';
import type { Hindrance } from './Hindrance.dto';
import type { Power } from './Power.dto';
import { Trait } from './Trait.dto';
import type { Weapon } from './Weapon.dto';
import { Attributes, CoreSkills, DiceValues, Ranks } from './wildcards-consts';

export class WildCardCharacter extends BaseEntity {
  _id?: string;
  race?: string;
  rank?: Ranks = Ranks.Novice;
  size?: number = 0;
  bennies?: number;
  maxPowerPoints?: number = 0;
  currentPowerPoints?: number = 0;
  conviction?: boolean;
  bio?: string;
  imageUrl?: string;
  pace?: number;
  paceMod?: number = 0;
  parry?: number;
  parryMod?: number = 0;
  toughness?: number;
  toughnessMod?: number = 0;
  wounds: number = 0;
  fatigue: number = 0;
  attributes: Trait[] = Object.values(Attributes).map(
    (attribute) => new Trait(attribute, DiceValues.d4),
  );
  skills: Trait[] = Object.values(CoreSkills).map((skill) => new Trait(skill, DiceValues.d4));
  gear?: Gear[];
  hindrances?: Hindrance[];
  edges?: Edge[];
  weapons?: Weapon[];
  powers?: Power[];
  armors?: Armor[];

  constructor(name?: string) {
    super(name);
  }
}
