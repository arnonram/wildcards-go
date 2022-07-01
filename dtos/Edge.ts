import { BaseEntity } from "./BaseEntity.dto";
import { v4 as uuidv4 } from "uuid";

export class Edge extends BaseEntity {
  _id: string;
  blurb?: string;
  edgeType?: string;
  requirements?: string;
  description?: string;

  constructor(name: string) {
    super(name);
    this._id = uuidv4().replaceAll("-", "");
  }
}
