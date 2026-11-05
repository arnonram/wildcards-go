import { newId } from '../helpers/new-id';
import { BaseEntity } from './BaseEntity.dto';

export class Edge extends BaseEntity {
  _id: string;
  edgeType?: string;
  requirements?: string;
  description?: string;

  constructor(name: string) {
    super(name);
    this._id = newId().replaceAll('-', '');
  }
}
