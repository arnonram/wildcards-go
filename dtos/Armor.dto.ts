import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Armor extends BaseEntity {
  _id: string;
  isEquipped: boolean = false;
  armorBonus?: number = 0;
  /** Shields only: Parry bonus while equipped. */
  parry?: number;
  /** Shields only: modifier to ranged attacks, as entered. */
  cover?: number;
  /**
   * One of `ArmorLocations`, or free text when the armor covers a custom area.
   * Stored as a single string so presets and custom values share one field.
   */
  locations?: string;
  weight?: number;
  cost?: number;
  comments?: string;

  constructor(name: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
  }
}
