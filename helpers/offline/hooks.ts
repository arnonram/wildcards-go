import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CharToLoad } from '../../dtos/CharToLoad';
import { db, type LocalCharacter } from './db';
import { getSyncStatus, type SyncStatus, subscribeSync } from './sync';

/** Live list of characters that are not deleted, by name. `undefined` while loading. */
export function useCharacterList(): CharToLoad[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.characters.where('deleted').equals(0).toArray();
    return rows
      .map((row) => ({ _id: row.id, name: row.data.name, portraitRev: row.data.portraitRev }))
      .sort((left, right) => (left.name || '').localeCompare(right.name || ''));
  });
}

/** Live row. `undefined` while loading, `null` if missing or deleted. */
export function useCharacter(id: string | undefined): LocalCharacter | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const row = await db.characters.get(id);
    return row && !row.deleted ? row : null;
  }, [id]);
}

/** Object URL for the stored portrait, revoked when it changes or unmounts. */
export function usePortraitUrl(id: string | undefined): string | undefined {
  const blob = useLiveQuery(
    async () => (id ? (await db.portraits.get(id))?.blob : undefined),
    [id],
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
