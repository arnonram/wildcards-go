import { BaseEntity } from "./BaseEntity.dto";

export class Armor extends BaseEntity {
  _id: string;
  weight?: number;
  cost?: number;
  armorBonus?: string;
  locations?: string;
  comments?: string;

  constructor(name: string) {
    super(name);
    this._id = crypto.randomUUID().replaceAll("-", "");
  }
}
