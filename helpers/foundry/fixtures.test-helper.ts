import { existsSync, readdirSync } from 'node:fs';
import type { FoundryActor } from './actor';
import hero from './fixtures/test-hero.json';

export const testHero = (): FoundryActor => structuredClone(hero) as FoundryActor;

/** Real exports kept out of git; tested only when present on this machine. */
const LOCAL_DIR = `${import.meta.dir}/../../docs/import-samples-foundry`;

export async function localSamples(): Promise<FoundryActor[]> {
  if (!existsSync(LOCAL_DIR)) return [];
  return Promise.all(
    readdirSync(LOCAL_DIR)
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => JSON.parse(await Bun.file(`${LOCAL_DIR}/${file}`).text())),
  );
}
