import { BaseEntity } from "./BaseEntity.dto";

export class Power extends BaseEntity {
  pp?: string;
  range?: string;
  duration?: number;
  effect?: string;
  comments?: string;

  constructor(name: string) {
    super(name);
  }
}
