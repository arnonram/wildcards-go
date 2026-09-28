import { BaseEntity } from "./BaseEntity.dto";
import { Power } from "./Power.dto";
import { Weapon } from "./Weapon.dto";
import { Gear } from "./Gear.dto";
import { Trait } from "./Trait.dto";
import { Attributes, CoreSkills, Ranks } from "./wildcards-consts";
import { DiceValues } from "../components/character-sheet/DiceDropdown";
import { Hindrance } from "./Hindrance.dto";
import { Edge } from "./Edge";
import { Armor } from "./Armor.dto";

export class WildCardCharacter extends BaseEntity {
  _id?: string;
  race?: string;
  rank?: Ranks = Ranks.Novice;
  bennies?: number;
  conviction?: string;
  bio?: string;
  pace?: number;
  paceMod?: number = 0;
  parry?: number;
  parryMod?: number = 0;
  toughness?: number;
  toughnessMod?: number = 0;
  wounds: number = 0;
  fatigue: number = 0;
  attributes: Trait[] = Object.values(Attributes).map(
    (attribute) => new Trait(attribute, DiceValues.d4)
  );
  skills: Trait[] = Object.values(CoreSkills).map(
    (skill) => new Trait(skill, DiceValues.d4)
  );
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
