import { BaseEntity } from "./BaseEntity.dto";

export class Hindrance extends BaseEntity {
  _id: string;
  blurb?: string;
  isMajor: boolean;
  description?: string;

  constructor(
    name: string,
    isMajor: boolean = false,
    blurb?: string,
    description?: string
  ) {
    super(name);
    this._id = crypto.randomUUID().replaceAll("-", "");
    this.isMajor = isMajor;
    this.blurb = blurb;
    this.description = description;
  }
}
