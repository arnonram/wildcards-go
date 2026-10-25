import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CharToLoad } from '../../dtos/CharToLoad';
import {
  getActiveDb,
  getSyncStatus,
  listCharacters,
  subscribeActive,
  subscribeSync,
} from './active';
import type { LocalCharacter, WcgDb } from './db';
import type { SyncStatus } from './sync';

/** The active store; components re-render when the account changes. */
export function useActiveDb(): WcgDb {
  return useSyncExternalStore(subscribeActive, getActiveDb, getActiveDb);
}

/** Live list of characters that are not deleted, by name. `undefined` while loading. */
export function useCharacterList(): CharToLoad[] | undefined {
  const database = useActiveDb();
  return useLiveQuery(() => listCharacters(database), [database]);
}

/** Live row. `undefined` while loading, `null` if missing or deleted. */
export function useCharacter(id: string | undefined): LocalCharacter | null | undefined {
  const database = useActiveDb();
  return useLiveQuery(async () => {
    if (!id) return null;
    const row = await database.characters.get(id);
    return row && !row.deleted ? row : null;
  }, [database, id]);
}

/** Object URL for the stored portrait, revoked when it changes or unmounts. */
export function usePortraitUrl(id: string | undefined): string | undefined {
  const database = useActiveDb();
  const blob = useLiveQuery(
    async () => (id ? (await database.portraits.get(id))?.blob : undefined),
    [database, id],
  );
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSync, getSyncStatus, getSyncStatus);
}
