# Sheet Translations and Language Picker — Design

## Why

Players at non-English tables want the character sheet in their own language.
First step: translate the character sheet only, with a language picker the
player can change at any time.

## Goals

- Character sheet fixed text appears in the chosen language.
- Languages: English (`en`), German (`de`), Spanish (`es`), French (`fr`),
  Brazilian Portuguese (`pt-BR`) — the set the sibling project
  `swade-npc-importer` already ships.
- Picker sits in the app top bar, right next to the theme controls
  (`components/layout/Layout.tsx`, beside `SkinMenu` / `ModeToggle`).
- Switching is instant (no reload, no navigation) and works at any time.
- Choice is remembered on the device.

## Non-goals

- Translating anything outside the character sheet (home page, character list,
  account menu, dialogs not rendered by the sheet, footer, privacy page, emails).
  These stay English for now.
- Translating text the player typed: custom skill names, edges, hindrances,
  gear, weapons, armor names, powers, notes, character name, etc.
- Syncing the language to the account / server.
- Locale-prefixed URLs or Next.js `i18n` routing.
- Locale-aware number/date formatting.

## Anti-goals (a failure even if it works)

- Stored character data changes because of the language. Data stays
  language-neutral; switching language must never write to a character or
  trigger a sync.
- A missing translation shows a raw key or blank. Missing keys fall back to
  English.
- A player's renamed core skill gets "translated" back into a stock name.

## Decided by the user

- Scope: sheet only.
- Picker placement: top bar next to the theme toggle.
- Core skills: only the five starting core skills (Athletics, Common Knowledge,
  Notice, Persuasion, Stealth) are translated. Every other skill name is entered
  manually and is shown as typed.

## Decided (builder's call, made during design)

- **What on the sheet is translated:** all fixed UI text rendered by
  `components/character-sheet/**` — section titles, nav, labels, table headers,
  buttons, placeholders, `aria-label`s, `title`s, sr-only text — plus fixed
  game values chosen from fixed lists: attributes (`Attributes` enum), ranks
  (`Ranks`), armor locations (`ArmorLocations`), derived stats (Pace, Parry,
  Toughness), Bennies/Wounds/Fatigue, Conviction. Shared `components/ui/*`
  pieces that carry their own built-in text (e.g. a delete button's aria-label)
  are translated where they render on the sheet.
- **Core skills translate at display time.** Stored name stays English (new
  characters still seed English names from `CoreSkills`). When a skill's stored
  name exactly equals one of the five `CoreSkills` values, the sheet shows the
  translated name; otherwise it shows the stored text. In the skill-name input,
  the translated name is shown; the stored value only changes if the player
  actually edits the text (then whatever they typed is stored as-is — except
  that text exactly equal to a core skill's name in the current language is
  stored as the stock English name, so it keeps translating; this also applies
  to newly added skills).
- **Sheet page frame counts as the sheet.** `pages/character/[characterId].tsx`
  text is translated too: loading / not-found states, "← All characters",
  "Character sheet" label, the `<title>` fallback "Unnamed Character", and the
  delete-character confirmation dialog it renders (so the sheet's delete button
  never opens an English dialog).
- **Skill "Sort A–Z" uses the name the player sees.** `sortByName` /
  `isSortedByName` get an optional name-lookup function; the skills list passes
  the core-skill display mapping. Sorting is a deliberate player action, so the
  saved order reflecting the language at that moment is acceptable; merely
  switching language still writes nothing (the button's greyed-out state may
  change after a switch — that is fine). Other lists keep sorting by stored name
  (their names are player-typed, identical in every language).
- **Typo in enum key** `CoreSkills.CommonKnowlegde` is left alone unless touching
  it is needed; the stored value `'Common Knowledge'` is what matters.
- **No i18n library.** A small in-house module mirrors the existing theme
  pattern (`helpers/context/theme-context.tsx`):
  - `LocaleProvider` + `useTranslation()` hook returning `t(key, vars?)` and
    `locale` / `setLocale`.
  - Dictionaries: one flat JSON file per language, e.g. `lang/en.json`,
    `lang/de.json`, …, keys like `sheet.status.parry`. English is the source of
    truth; the key type is derived from `en.json` so `t('typo')` is a type
    error. Other languages may omit keys; missing keys fall back to English.
  - Interpolation: `{name}` placeholders, same style as the importer files.
  - Plurals: only if a string actually needs one; use `Intl.PluralRules`, no
    library.
  - All five dictionaries are bundled statically (they are small); no lazy
    loading.
- **Persistence:** `localStorage` key `wc-locale`. First visit with nothing
  stored: use the first of `navigator.languages` that matches a supported
  language (exact match, then base-language match, e.g. `pt-PT` → `pt-BR`,
  `de-AT` → `de`), else English.
- **No flash / hydration:** follow the theme approach — the blocking script in
  `pages/_document.tsx` resolves the stored/browser locale and sets
  `document.documentElement.lang` before paint; the provider reads it after
  mount. Server render is English; the sheet is client-rendered from IndexedDB
  anyway, so a brief English frame before mount is acceptable if the sheet ever
  renders before mount.
- **`<html lang>`** is kept in sync with the chosen locale (accessibility,
  screen-reader pronunciation).
- **Picker UI:** a `Menu` like `SkinMenu` — globe/languages icon trigger, items
  show each language's own name (English, Deutsch, Español, Français,
  Português (Brasil)) with a check on the active one. Visible on all pages (it
  lives in the global top bar); on non-sheet pages it simply has no visible
  effect yet. Its own labels follow the chosen language.
- **Translation text:** game terms reuse the wording in
  `../swade-npc-importer/src/lang/*.json` (`npcImporter.parser.*` keys: Agility,
  Smarts, Spirit, Strength, Vigor, Skills, Hindrances, Edges, Powers, Pace,
  Parry, Toughness, Power Points, Gear, Armor, Shield, Conviction, Athletics,
  Fighting, Shooting, etc.), copied into this repo's files (no runtime link to
  the other project). Everything else the builder drafts; a native speaker can
  correct the JSON later. Where the importer lacks a term in some language
  (es/pt-BR files are shorter), the builder drafts it.
- **Placement in repo:** `lang/*.json` at repo root, provider in
  `helpers/context/locale-context.tsx`, picker in
  `components/layout/LanguageMenu.tsx` (or alongside `ThemeControls.tsx`).

## Testing (what must be proven)

`bun test`, existing style (`helpers/*.test.ts`):

- Every non-English dictionary has only keys that exist in `en.json` (no stale
  keys) and every value keeps the same `{placeholders}` as English.
- `t` returns the chosen language's string, falls back to English for a missing
  key, and fills `{vars}`.
- Locale resolution: stored value wins; else browser-language matching rules
  above; else `en`; unknown stored value is ignored.
- Core-skill display: each of the five English names maps to its translation;
  any other name (including a near-miss like `athletics` or a renamed skill)
  is returned unchanged.
- `sortByName` / `isSortedByName` with a lookup sort by the looked-up name;
  without one, behaviour is unchanged.
- Switching language does not write to the character store. Proven
  structurally, **no new test dependencies** (no DOM env / testing-library):
  locale state lives only in its own provider + `localStorage`, never in
  `wildcard-context`; the locale-setting helper is a pure function tested to
  touch only `localStorage`, and translation helpers take a skill name in and
  return a string without mutating input.

Manual check in the running app: switch each language on a sheet, confirm text
changes instantly, reload keeps it, renamed core skill stays as typed, layout
holds with longer German/French strings on a phone width.

## Left to the builder

- Exact key naming and grouping.
- Exact draft wording for strings not covered by the importer files.
- Picker icon choice and whether it shows a short code (e.g. `DE`) next to the
  icon.
- How to thread `t` into small presentational components (hook vs prop).
