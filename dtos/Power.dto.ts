import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Power extends BaseEntity {
  _id: string;
  pp?: string;
  range?: string;
  /** Older characters may hold a number. */
  duration?: string | number;
  effect?: string;
  comments?: string;

  constructor(name: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
  }
}
