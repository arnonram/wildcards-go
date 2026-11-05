import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Gear extends BaseEntity {
  _id: string;
  weight?: number;
  cost?: number;
  details?: string;

  constructor(name: string, weight?: number, cost?: number, details?: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
    this.weight = weight;
    this.cost = cost;
    this.details = details;
  }
}
