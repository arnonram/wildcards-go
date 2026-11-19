import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

export interface ReferenceEntry {
  name: string;
  meta?: string;
  text: string;
}

export interface ReferenceSections {
  hindrances: ReferenceEntry[];
  edges: ReferenceEntry[];
  powers: ReferenceEntry[];
  bio?: string;
}

type Translate = (key: 'sheet.hindrances.major' | 'sheet.powers.pp') => string;

const clean = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

function entry(name: unknown, text: unknown, meta?: string): ReferenceEntry[] {
  const body = clean(text);
  if (!body) return [];
  return [{ name: clean(name), ...(meta ? { meta } : {}), text: body }];
}

export function referenceSections(c: WildCardCharacter, t: Translate): ReferenceSections {
  const bio = clean(c.bio);
  return {
    hindrances: (c.hindrances ?? []).flatMap((h) =>
      entry(h.name, h.description, h.isMajor ? t('sheet.hindrances.major') : undefined),
    ),
    edges: (c.edges ?? []).flatMap((e) => entry(e.name, e.description)),
    powers: (c.powers ?? []).flatMap((p) => {
      const pp = clean(p.pp);
      const meta = [pp && `${t('sheet.powers.pp')} ${pp}`, clean(p.range), clean(p.duration)]
        .filter(Boolean)
        .join(' · ');
      return entry(p.name, p.effect, meta || undefined);
    }),
    ...(bio ? { bio } : {}),
  };
}

export function hasReference({ hindrances, edges, powers, bio }: ReferenceSections): boolean {
  return hindrances.length + edges.length + powers.length > 0 || !!bio;
}

/** Cheap check for the print menu, which re-renders on every edit. */
export function characterHasReference(c: WildCardCharacter): boolean {
  return (
    !!clean(c.bio) ||
    (c.hindrances ?? []).some((h) => clean(h.description)) ||
    (c.edges ?? []).some((e) => clean(e.description)) ||
    (c.powers ?? []).some((p) => clean(p.effect))
  );
}
