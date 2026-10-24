import { BaseEntity } from './BaseEntity.dto';

export class Edge extends BaseEntity {
  _id: string;
  blurb?: string;
  edgeType?: string;
  requirements?: string;
  description?: string;

  constructor(name: string) {
    super(name);
    this._id = crypto.randomUUID().replaceAll('-', '');
  }
}
