import { BaseEntity } from "./BaseEntity.dto";

export class Hindrance extends BaseEntity {
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
    this.isMajor = isMajor;
    this.blurb = blurb;
    this.description = description;
  }
}
