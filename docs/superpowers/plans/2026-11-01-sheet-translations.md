# Sheet Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the character sheet into en/de/es/fr/pt-BR with a language picker in the top bar that switches instantly and is remembered per device.

**Architecture:** Pure helpers in `helpers/i18n.ts` (locale resolution, `translate`, trait-name display mapping) over flat JSON dictionaries in `lang/`. A `LocaleProvider` (mirrors `theme-context.tsx`) exposes `useTranslation()`. Stored character data stays English; translation happens only at render.

**Tech Stack:** Next.js 16 pages router, React 19, TypeScript 7, bun test, Biome. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-sheet-translations-design.md`

## Global Constraints

- Locales, in this order: `en`, `de`, `es`, `fr`, `pt-BR`. Native names: English, Deutsch, Español, Français, Português (Brasil).
- `localStorage` key: `wc-locale`.
- No new dependencies (runtime or dev). No DOM test env.
- English (`lang/en.json`) is the source of truth; other files may omit keys; missing → English. Never show a raw key.
- Interpolation syntax `{name}`.
- Switching language never writes to a character, Dexie, or the sync queue.
- Only the five `CoreSkills` values (exact match) are translated among skill names; attributes translate by exact `Attributes` value; everything player-typed shows as stored.
- Game terms copy wording from `../swade-npc-importer/src/lang/<locale>.json` (`npcImporter.parser.*`), copied into this repo.
- Scope: `components/character-sheet/**`, `pages/character/[characterId].tsx` (incl. its delete dialog, loading/not-found, back link, `<title>` fallback), and built-in text of shared `components/ui/*` used on the sheet (DeleteButton, Pips, Stepper, Dialog close). Nothing else.
- Verification gate per task: `bun test`, `bunx tsc --noEmit`, `bun run check`.

## Review Focus

1. Browser language `pt-PT`/`pt` with nothing stored → `pt-BR`; `de-AT` → `de`; `zh-CN` → `en`. (Task 1 test)
2. Garbage in `localStorage` (`"klingon"`, `""`) → ignored, browser/en used; `localStorage` throwing (private mode) → no crash. (Task 1 test + Task 2 provider try/catch)
3. Player renamed a core skill to lowercase `athletics` or `Athletics ` (trailing space) → shown as typed, not translated. (Task 1 test)
4. Locale file missing a key or with a mismatched `{placeholder}` → English fallback / test failure, never `{name}` leaking or a raw key. (Task 1 test)
5. Skill sort in German with core skills present → sorted by German names, button disabled state consistent with what's shown. (Task 3 test)

---

### Task 1: i18n core helpers and English dictionary scaffold

**Files:**
- Create: `lang/en.json`, `lang/de.json`, `lang/es.json`, `lang/fr.json`, `lang/pt-BR.json` (non-en start as `{}`; en starts with the `language.*` and `trait.*` keys below)
- Create: `helpers/i18n.ts`
- Test: `helpers/i18n.test.ts`

**Interfaces:**
- Produces:
  - `export const LOCALES = ['en','de','es','fr','pt-BR'] as const; export type Locale = (typeof LOCALES)[number];`
  - `export const LOCALE_STORAGE_KEY = 'wc-locale';`
  - `export const LOCALE_NAMES: Record<Locale, string>` (native names above)
  - `export type MessageKey = keyof typeof en;` (en imported from `../lang/en.json`)
  - `export const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>>`
  - `export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string`
  - `export function resolveLocale(stored: string | null, browserLanguages: readonly string[], supported: readonly string[]): string` — **self-contained** (references no outer binding, plain loops, no helpers) because Task 2 embeds `resolveLocale.toString()` in the `_document` blocking script.
  - `export function isLocale(value: unknown): value is Locale`
  - `export function traitLabel(kind: 'attribute' | 'skill', name: string, t: (key: MessageKey) => string): string`
- en keys this task adds: `language.label` ("Language"), `trait.attribute.Agility|Smarts|Spirit|Strength|Vigor`, `trait.skill.Athletics`, `trait.skill.CommonKnowledge` ("Common Knowledge"), `trait.skill.Notice`, `trait.skill.Persuasion`, `trait.skill.Stealth`.

- [ ] **Step 1: Write failing tests in `helpers/i18n.test.ts`**

```ts
describe('resolveLocale', () => {
  const S = LOCALES;
  test('stored supported value wins', () => expect(resolveLocale('fr', ['de-DE'], S)).toBe('fr'));
  test('unknown stored value ignored', () => {
    expect(resolveLocale('klingon', ['de-AT'], S)).toBe('de');
    expect(resolveLocale('', [], S)).toBe('en');
  });
  test('exact browser match before base match', () =>
    expect(resolveLocale(null, ['pt-BR'], S)).toBe('pt-BR'));
  test('base-language match', () => {
    expect(resolveLocale(null, ['pt-PT'], S)).toBe('pt-BR');
    expect(resolveLocale(null, ['pt'], S)).toBe('pt-BR');
    expect(resolveLocale(null, ['de-AT'], S)).toBe('de');
  });
  test('first matching browser language wins', () =>
    expect(resolveLocale(null, ['zh-CN', 'es-MX', 'fr'], S)).toBe('es'));
  test('falls back to en', () => expect(resolveLocale(null, ['zh-CN'], S)).toBe('en'));
  test('is self-contained when stringified', () => {
    const fn = new Function(`return (${resolveLocale.toString()})`)();
    expect(fn(null, ['de-AT'], S)).toBe('de');
  });
});

describe('translate', () => {
  test('falls back to English for missing key', () =>
    expect(translate('de', 'language.label')).toBe('Language')); // de.json is {} in this task
});

describe('interpolate', () => {
  test('fills vars and leaves unknown placeholders', () =>
    expect(interpolate('Delete {name} {x}', { name: 'Axe' })).toBe('Delete Axe {x}'));
});

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
describe('dictionaries', () => {
  for (const locale of LOCALES) {
    test(`${locale}: only English keys, same placeholders, no empty values`, () => {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(key in dictionaries.en).toBe(true);
        expect(value?.trim()).not.toBe('');
        expect(placeholders(value!)).toEqual(placeholders(dictionaries.en[key as MessageKey]!));
      }
    });
  }
});

describe('traitLabel', () => {
  const t = (key: MessageKey) => `T:${key}`;
  test('translates the five core skills', () => {
    expect(traitLabel('skill', 'Common Knowledge', t)).toBe('T:trait.skill.CommonKnowledge');
    // + Athletics, Notice, Persuasion, Stealth
  });
  test('leaves other or altered skill names alone', () => {
    for (const n of ['athletics', 'Athletics ', 'Fighting', 'Agility', ''])
      expect(traitLabel('skill', n, t)).toBe(n);
  });
  test('translates attributes only as attributes', () => {
    expect(traitLabel('attribute', 'Vigor', t)).toBe('T:trait.attribute.Vigor');
    expect(traitLabel('attribute', 'Notice', t)).toBe('Notice');
  });
});
```

Export `interpolate(text: string, vars?: Record<string, string | number>): string` (unknown `{x}` left as-is) and test it directly.

- [ ] **Step 2:** `bun test helpers/i18n.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `helpers/i18n.ts` + JSON files.** Map core skills via a `Record<CoreSkills, MessageKey>` and attributes via `Record<Attributes, MessageKey>` (import enums from `dtos/wildcards-consts`), so a new enum member is a type error.
- [ ] **Step 4:** `bun test helpers/i18n.test.ts` → PASS; run gate.
- [ ] **Step 5: Commit** `feat(i18n): add locale helpers and dictionaries`

---

### Task 2: LocaleProvider, blocking script, language picker

**Files:**
- Create: `helpers/context/locale-context.tsx`
- Create: `components/layout/LanguageMenu.tsx`
- Modify: `pages/_document.tsx` (append locale resolution to the blocking script), `pages/_app.tsx` (wrap in `LocaleProvider` inside `ThemeProvider`), `components/layout/Layout.tsx` (render `<LanguageMenu />` immediately before `<SkinMenu />`)
- Modify: `helpers/i18n.ts` — add `persistLocale`
- Test: `helpers/i18n.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `export function persistLocale(locale: Locale, storage: Pick<Storage, 'setItem'>, root: { lang: string }): void` — sets `root.lang`, then `storage.setItem(LOCALE_STORAGE_KEY, locale)` inside try/catch (storage may throw).
  - `export function LocaleProvider({ children }: { children: ReactNode })`
  - `export function useTranslation(): { locale: Locale; setLocale: (l: Locale) => void; t: (key: MessageKey, vars?: Record<string, string | number>) => string }` — `t` memoized on `locale`.

- [ ] **Step 1: Failing test**

```ts
describe('persistLocale', () => {
  test('writes only lang and the locale key', () => {
    const calls: [string, string][] = [];
    const root = { lang: 'en' };
    persistLocale('de', { setItem: (k, v) => calls.push([k, v]) }, root);
    expect(root.lang).toBe('de');
    expect(calls).toEqual([['wc-locale', 'de']]);
  });
  test('survives a throwing storage', () => {
    const root = { lang: 'en' };
    expect(() =>
      persistLocale(
        'fr',
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        root,
      ),
    ).not.toThrow();
    expect(root.lang).toBe('fr');
  });
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.**
  - `_document.tsx`: inside the existing try, add `document.documentElement.lang = (${resolveLocale.toString()})(localStorage.getItem('${LOCALE_STORAGE_KEY}'), navigator.languages || [], ${JSON.stringify(LOCALES)});` Keep `<Html lang="en">` as SSR default (already has `suppressHydrationWarning`).
  - Provider: initial state `'en'`; after mount read `document.documentElement.lang`, adopt it if `isLocale`. `setLocale` → state + `persistLocale(next, localStorage, document.documentElement)`. Provider holds no reference to `wildcard-context`.
  - `LanguageMenu`: copy `SkinMenu` structure/classes; trigger icon `Languages` from lucide-react, `aria-label`/`title` = `t('language.label')`; group label `t('language.label')`; items = `LOCALES.map` with `LOCALE_NAMES[l]`, check on active, `lang={l}` on each item's name span.
- [ ] **Step 4:** tests PASS; gate. Manual: `bun dev`, pick Deutsch, reload → `<html lang="de">` before hydration (view source of DOM in devtools), picker shows check on Deutsch.
- [ ] **Step 5: Commit** `feat(i18n): language picker and locale provider`

---

### Task 3: Sort skills by displayed name

**Files:**
- Modify: `helpers/sort-by-name.ts`, `components/character-sheet/SortByNameButton.tsx`
- Test: `helpers/sort-by-name.test.ts`

**Interfaces:**
- Produces:
  - `sortByName<T extends { name: string }>(items: readonly T[], getName?: (item: T) => string): T[]`
  - `isSortedByName<T extends { name: string }>(items: readonly T[], getName?: (item: T) => string): boolean`
  - `SortByNameButton` gains optional prop `getName?: (item: T) => string`, passed to both.

- [ ] **Step 1: Failing tests** (add to existing file)

```ts
test('sorts by looked-up name when given', () => {
  const de: Record<string, string> = {
    Athletics: 'Athletik',
    Notice: 'Wahrnehmung',
    'Common Knowledge': 'Allgemeinwissen',
  };
  const get = (i: { name: string }) => de[i.name] ?? i.name;
  expect(
    names(sortByName(named('Notice', 'Athletics', 'Common Knowledge', 'Fighting'), get)),
  ).toEqual(['Common Knowledge', 'Athletics', 'Fighting', 'Notice']);
  expect(isSortedByName(named('Common Knowledge', 'Athletics', 'Fighting', 'Notice'), get)).toBe(
    true,
  );
  expect(isSortedByName(named('Athletics', 'Common Knowledge'), get)).toBe(false);
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** thread `getName` (default `item => item.name`) into the comparator; existing tests unchanged.
- [ ] **Step 4:** PASS; gate.
- [ ] **Step 5: Commit** `feat(sort): optional name lookup for sort-by-name`

---

### Task 4: Translate sheet frame, header, status, nav, basics, shared UI

**Files:**
- Modify: `pages/character/[characterId].tsx`, `components/character-sheet/{CharacterSheet,SheetHeader,SheetNav,StatusStrip,Basics,ConflictBanner,ConvictionToggle,DiePicker,SortByNameButton}.tsx`, `components/ui/{DeleteButton,Pips,Stepper,Dialog}.tsx`, `components/DeleteConfirmationDialog.tsx` (only if the character page renders it), `lang/en.json`
- Test: covered by Task 1 dictionary tests + `bunx tsc` (unknown keys are type errors)

**Interfaces:**
- Consumes: `useTranslation()`, `traitLabel`, `MessageKey`.
- Produces: en keys under `sheet.*`, `page.character.*`, `ui.*`, `rank.<Rank>` (Novice, Seasoned, Veteran, Heroic, Legendary), `stat.pace|parry|toughness|bennies|wounds|fatigue|conviction`.

- [ ] **Step 1:** grep each file for user-visible literals (JSX text, `label=`, `aria-label=`, `title=`, `placeholder=`, template strings in labels, `<title>`). List them.
- [ ] **Step 2:** add keys to `lang/en.json` with the exact current English text (so English UI is byte-identical); replace literals with `t(...)`. Ranks: `Basics` options `label: t(\`rank.${rank}\`)`-style via a `Record<Ranks, MessageKey>`in`helpers/i18n.ts` (`rankKey`); `SheetHeader` display likewise. Value stored stays the enum value.
- [ ] **Step 3:** gate passes. Manual: sheet in English looks unchanged.
- [ ] **Step 4: Commit** `feat(i18n): translate sheet frame and status`

---

### Task 5: Translate sheet sections (traits, edges, hindrances, gear, weapons, armor, powers)

**Files:**
- Modify: `components/character-sheet/traits/Traits.tsx`, `edges/Edges.tsx`, `hindrances/Hindrances.tsx`, `gear/Gear.tsx`, `weapons/Weapons.tsx`, `armor/{Armors,ArmorLocationSelect}.tsx`, `powers/Powers.tsx`, `lang/en.json`, `helpers/i18n.ts` (add `armorLocationKey: Record<ArmorLocations, MessageKey>`)

**Interfaces:**
- Consumes: Task 1 `traitLabel`, Task 3 `SortByNameButton getName`.

- [ ] **Step 1:** same literal sweep and replacement as Task 4.
- [ ] **Step 2: Traits specifics.**
  - Attribute rows: show `traitLabel('attribute', trait.name, t)`; DiePicker `name` and modifier aria-label use that label.
  - Skill rows: the name `Field` value is `traitLabel('skill', trait.name, t)`; `onChange` stores `event.target.value` verbatim. (Unchanged text never fires onChange, so stored English stays.)
  - Skills `SortByNameButton` gets `getName={(s) => traitLabel('skill', s.name, t)}`.
- [ ] **Step 3:** Armor location select: built-in locations' option labels via `armorLocationKey`; stored value unchanged; custom location text shown as stored.
- [ ] **Step 4:** gate passes; manual English sheet unchanged.
- [ ] **Step 5: Commit** `feat(i18n): translate sheet sections`

---

### Task 6: Draft de/es/fr/pt-BR dictionaries

**Files:**
- Modify: `lang/de.json`, `lang/es.json`, `lang/fr.json`, `lang/pt-BR.json`
- Test: `helpers/i18n.test.ts` (add one real-locale `translate` assertion)

- [ ] **Step 1:** for each key in `en.json`, game terms take the importer's `npcImporter.parser.*` wording for that locale (Agility, Smarts, Spirit, Strength, Vigor, Skills, Hindrances, Edges, Powers, Pace, Parry, Toughness, Power Points, Gear, Armor, Shield, Conviction, Athletics, …); where absent, draft. Keep `{placeholders}` identical.
- [ ] **Step 2:** add test `expect(translate('de', 'trait.attribute.Vigor')).toBe('Konstitution')` (or whatever de importer uses for Vigor — copy exact value) and `expect(translate('de', 'trait.attribute.Vigor')).not.toBe('Vigor')`.
- [ ] **Step 3:** completeness check (one-off, not a test): `bun -e` script printing en keys missing per locale → expect none.
- [ ] **Step 4:** gate passes. Manual (run skill): each language on a sheet at 375px width — no overflow in StatusStrip, nav, table headers; renamed core skill stays as typed; reload keeps language; Network/Dexie shows no character write on switch.
- [ ] **Step 5: Commit** `feat(i18n): add de, es, fr, pt-BR translations`
