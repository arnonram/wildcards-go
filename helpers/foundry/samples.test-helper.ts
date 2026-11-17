import { readdirSync } from 'node:fs';
import type { FoundryActor } from './actor';

export const SAMPLES_DIR = `${import.meta.dir}/../../docs/import-samples-foundry`;

export async function sample(name: string): Promise<FoundryActor> {
  const file = readdirSync(SAMPLES_DIR).find((f) => f.startsWith(`fvtt-Actor-${name}-`));
  return JSON.parse(await Bun.file(`${SAMPLES_DIR}/${file}`).text());
}
