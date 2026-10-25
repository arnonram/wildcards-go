import type { PutCharacterBody } from '../dtos/sync';
import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The trust boundary for character writes. Checks the envelope and the fields
 * every sheet reads on load, so a malformed write cannot break the owner's
 * other devices when they pull it. A tombstone's data is discarded, so only
 * its envelope is checked.
 */
export function parsePutBody(body: unknown): PutCharacterBody | null {
  if (!isRecord(body)) return null;
  const { baseVersion, deleted, data } = body;
  if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) return null;
  if (typeof deleted !== 'boolean') return null;
  if (!isRecord(data)) return null;
  if (!deleted) {
    if (typeof data.name !== 'string') return null;
    if (typeof data.wounds !== 'number' || typeof data.fatigue !== 'number') return null;
    if (!Array.isArray(data.attributes) || !Array.isArray(data.skills)) return null;
  }
  return {
    baseVersion: baseVersion as number,
    deleted,
    data: data as unknown as WildCardCharacter,
  };
}
