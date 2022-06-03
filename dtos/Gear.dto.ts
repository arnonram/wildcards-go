import { BaseEntity } from "./BaseEntity.dto";

export class Gear extends BaseEntity {
  weight?: number;
  cost?: number;
  details?: string;

  constructor(name: string, weight?: number, cost?: number, details?: string) {
    super(name);
    this.weight = weight;
    this.cost = cost;
    this.details = details;
  }
}
