import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Power extends BaseEntity {
  _id: string;
  pp?: string;
  range?: string;
  duration?: number;
  effect?: string;
  comments?: string;

  constructor(name: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
  }
}
