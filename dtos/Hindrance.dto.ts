import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Hindrance extends BaseEntity {
  _id: string;
  isMajor: boolean;
  description?: string;

  constructor(name: string, isMajor: boolean = false, description?: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
    this.isMajor = isMajor;
    this.description = description;
  }
}
