import { BaseEntity } from "./BaseEntity.dto";

export class Weapon extends BaseEntity {
  range?: string;
  damage?: string;
  ap?: number;
  rof?: number;
  shots?: number;
  ammo?: number;
  minStr?: string;
  weight?: number;
  comments?: string;

  constructor(
    name: string,
    range?: string,
    damage?: string,
    ap?: number,
    rof?: number,
    shots?: number,
    ammo?: number,
    minStr?: string,
    weight?: number,
    comments?: string
  ) {
    super(name);
    this.range = range;
    this.damage = damage;
    this.ap = ap;
    this.rof = rof;
    this.shots = shots;
    this.ammo = ammo;
    this.minStr = minStr;
    this.weight = weight;
    this.comments = comments;
  }
}
