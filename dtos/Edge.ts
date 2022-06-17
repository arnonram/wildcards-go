import { BaseEntity } from "./BaseEntity.dto";

export class Edge extends BaseEntity {
  blurb?: string;
  edgeType?: string;
  requirements?: string[] = [];
  description?: string;

  constructor(name: string) {
    super(name);
  }
}
