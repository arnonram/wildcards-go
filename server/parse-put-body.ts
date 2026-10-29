import { isCharacterData, type PutCharacterBody } from '../dtos/sync';
import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The trust boundary for character writes. Checks the envelope and the
 * character data; a tombstone's data is discarded, so only its envelope is
 * checked.
 */
export function parsePutBody(body: unknown): PutCharacterBody | null {
  if (!isRecord(body)) return null;
  const { baseVersion, deleted, data } = body;
  if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) return null;
  if (typeof deleted !== 'boolean') return null;
  if (!isRecord(data)) return null;
  if (!deleted && !isCharacterData(data)) return null;
  return {
    baseVersion: baseVersion as number,
    deleted,
    data: data as unknown as WildCardCharacter,
  };
}
