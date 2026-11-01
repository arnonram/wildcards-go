import { ArmorLocations, Attributes, CoreSkills, Ranks } from '../dtos/wildcards-consts';
import de from '../lang/de.json';
import en from '../lang/en.json';
import es from '../lang/es.json';
import fr from '../lang/fr.json';
import ptBR from '../lang/pt-BR.json';

export const LOCALES = ['en', 'de', 'es', 'fr', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_STORAGE_KEY = 'wc-locale';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)',
};

/** English is the source of truth: its keys are the only valid message keys. */
export type MessageKey = keyof typeof en;
export type Messages = Partial<Record<MessageKey, string>>;
export type TranslateVars = Record<string, string | number>;

export const dictionaries: Record<Locale, Messages> = {
  en,
  de: de as Messages,
  es: es as Messages,
  fr: fr as Messages,
  'pt-BR': ptBR as Messages,
};

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

export function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Looks the key up in the locale, falling back to English. */
export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  return interpolate(dictionaries[locale][key] ?? en[key], vars);
}

/**
 * Picks the UI language: a supported stored choice, else the first browser
 * language that matches exactly or by base language (`pt-PT` → `pt-BR`), else
 * the first supported locale.
 *
 * Must stay self-contained (no outer bindings, no helpers): `_document` inlines
 * `resolveLocale.toString()` into its blocking script.
 */
export function resolveLocale(
  stored: string | null,
  browserLanguages: readonly string[],
  supported: readonly string[],
): string {
  if (stored && supported.indexOf(stored) !== -1) return stored;
  for (let i = 0; i < browserLanguages.length; i++) {
    const wanted = browserLanguages[i].toLowerCase();
    for (let j = 0; j < supported.length; j++) {
      if (supported[j].toLowerCase() === wanted) return supported[j];
    }
    const base = wanted.split('-')[0];
    for (let j = 0; j < supported.length; j++) {
      if (supported[j].toLowerCase().split('-')[0] === base) return supported[j];
    }
  }
  return supported[0];
}

/** Applies the choice to the document and remembers it on this device. */
export function persistLocale(
  locale: Locale,
  storage: Pick<Storage, 'setItem'>,
  root: { lang: string },
): void {
  root.lang = locale;
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be full or blocked (private mode); the choice still applies now.
  }
}

const attributeKeys: Record<Attributes, MessageKey> = {
  [Attributes.Agility]: 'trait.attribute.Agility',
  [Attributes.Smarts]: 'trait.attribute.Smarts',
  [Attributes.Spirit]: 'trait.attribute.Spirit',
  [Attributes.Strength]: 'trait.attribute.Strength',
  [Attributes.Vigor]: 'trait.attribute.Vigor',
};

const coreSkillKeys: Record<CoreSkills, MessageKey> = {
  [CoreSkills.Athletics]: 'trait.skill.Athletics',
  [CoreSkills.CommonKnowlegde]: 'trait.skill.CommonKnowledge',
  [CoreSkills.Notice]: 'trait.skill.Notice',
  [CoreSkills.Persuasion]: 'trait.skill.Persuasion',
  [CoreSkills.Stealth]: 'trait.skill.Stealth',
};

/**
 * Display name for a stored trait name. Stored names stay English; only exact
 * stock names are translated, so anything the player typed shows as typed.
 */
export function traitLabel(
  kind: 'attribute' | 'skill',
  name: string,
  t: (key: MessageKey) => string,
): string {
  return stockLabel(kind === 'attribute' ? attributeKeys : coreSkillKeys, name, t);
}

/**
 * Inverse of `traitLabel` for skills: typing a core skill's name exactly as the
 * current language shows it stores the stock English name, so it keeps
 * translating. Any other text is stored as typed.
 */
export function skillNameToStore(typed: string, t: (key: MessageKey) => string): string {
  for (const [stock, key] of Object.entries(coreSkillKeys)) {
    if (t(key) === typed) return stock;
  }
  return typed;
}

const rankKeys: Record<Ranks, MessageKey> = {
  [Ranks.Novice]: 'rank.Novice',
  [Ranks.Seasoned]: 'rank.Seasoned',
  [Ranks.Veteran]: 'rank.Veteran',
  [Ranks.Heroic]: 'rank.Heroic',
  [Ranks.Legendary]: 'rank.Legendary',
};

/** Display name for a stored rank; an unrecognised stored value shows as-is. */
export function rankLabel(rank: string, t: (key: MessageKey) => string): string {
  return stockLabel(rankKeys, rank, t);
}

const armorLocationKeys: Record<ArmorLocations, MessageKey> = {
  [ArmorLocations.Head]: 'armor.location.Head',
  [ArmorLocations.Torso]: 'armor.location.Torso',
  [ArmorLocations.Arms]: 'armor.location.Arms',
  [ArmorLocations.Legs]: 'armor.location.Legs',
};

/** Display name for a stored armor location; custom locations show as typed. */
export function armorLocationLabel(location: string, t: (key: MessageKey) => string): string {
  return stockLabel(armorLocationKeys, location, t);
}

function stockLabel(
  keys: Record<string, MessageKey>,
  value: string,
  t: (key: MessageKey) => string,
): string {
  return Object.hasOwn(keys, value) ? t(keys[value]) : value;
}
