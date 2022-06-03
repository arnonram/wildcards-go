import { DiceValues } from "../components/character-sheet/DiceDropdown";
import { BaseEntity } from "./BaseEntity.dto";

export class Trait extends BaseEntity {
  dice: DiceValues;
  mod?: string;

  constructor(name: string, dice: DiceValues) {
    super(name);
    this.dice = dice;
  }
}
