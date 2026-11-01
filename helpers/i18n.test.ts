import { describe, expect, test } from 'bun:test';
import { ArmorLocations, CoreSkills, Ranks } from '../dtos/wildcards-consts';
import {
  armorLocationLabel,
  dictionaries,
  interpolate,
  isLocale,
  LOCALES,
  type MessageKey,
  persistLocale,
  rankLabel,
  resolveLocale,
  skillNameToStore,
  traitLabel,
  translate,
} from './i18n';

describe('resolveLocale', () => {
  const S = LOCALES;

  test('stored supported value wins', () => {
    expect(resolveLocale('fr', ['de-DE'], S)).toBe('fr');
  });

  test('unknown stored value is ignored', () => {
    expect(resolveLocale('klingon', ['de-AT'], S)).toBe('de');
    expect(resolveLocale('', [], S)).toBe('en');
  });

  test('exact browser match', () => {
    expect(resolveLocale(null, ['pt-BR'], S)).toBe('pt-BR');
  });

  test('base-language match', () => {
    expect(resolveLocale(null, ['pt-PT'], S)).toBe('pt-BR');
    expect(resolveLocale(null, ['pt'], S)).toBe('pt-BR');
    expect(resolveLocale(null, ['de-AT'], S)).toBe('de');
  });

  test('first matching browser language wins', () => {
    expect(resolveLocale(null, ['zh-CN', 'es-MX', 'fr'], S)).toBe('es');
  });

  test('falls back to en', () => {
    expect(resolveLocale(null, ['zh-CN'], S)).toBe('en');
  });

  test('is self-contained when stringified', () => {
    const fn = new Function(`return (${resolveLocale.toString()})`)();
    expect(fn(null, ['de-AT'], S)).toBe('de');
    expect(fn('fr', [], S)).toBe('fr');
  });
});

describe('persistLocale', () => {
  test('writes only the document lang and the locale key', () => {
    const calls: [string, string][] = [];
    const root = { lang: 'en' };
    persistLocale('de', { setItem: (key, value) => calls.push([key, value]) }, root);
    expect(root.lang).toBe('de');
    expect(calls).toEqual([['wc-locale', 'de']]);
  });

  test('survives a throwing storage', () => {
    const root = { lang: 'en' };
    const storage = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => persistLocale('fr', storage, root)).not.toThrow();
    expect(root.lang).toBe('fr');
  });
});

describe('isLocale', () => {
  test('accepts only supported locales', () => {
    expect(isLocale('pt-BR')).toBe(true);
    expect(isLocale('pt')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('translate', () => {
  test('returns the chosen language', () => {
    expect(translate('de', 'trait.attribute.Vigor')).toBe('Konstitution');
    expect(translate('fr', 'page.character.deleteConfirm', { name: 'Red' })).toBe(
      'Voulez-vous vraiment supprimer Red ?',
    );
  });

  test('falls back to English for a missing key', () => {
    const key = 'language.label';
    const saved = dictionaries.de[key];
    delete dictionaries.de[key];
    try {
      expect(translate('de', key)).toBe('Language');
    } finally {
      dictionaries.de[key] = saved;
    }
  });
});

describe('interpolate', () => {
  test('fills vars and leaves unknown placeholders', () => {
    expect(interpolate('Delete {name} {x}', { name: 'Axe' })).toBe('Delete Axe {x}');
    expect(interpolate('{n} wounds', { n: 2 })).toBe('2 wounds');
  });
});

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  for (const locale of LOCALES) {
    test(`${locale}: only English keys, same placeholders, no empty values`, () => {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(key in dictionaries.en).toBe(true);
        expect(value?.trim()).not.toBe('');
        expect(placeholders(value ?? '')).toEqual(
          placeholders(dictionaries.en[key as MessageKey] ?? ''),
        );
      }
    });
  }
});

describe('rankLabel', () => {
  const t = (key: MessageKey) => `T:${key}`;

  test('translates known ranks and passes unknown values through', () => {
    expect(rankLabel('Heroic', t)).toBe('T:rank.Heroic');
    expect(rankLabel('Novice', t)).toBe('T:rank.Novice');
    expect(rankLabel('Demigod', t)).toBe('Demigod');
  });

  test('English rank labels match the stored values', () => {
    for (const rank of Object.values(Ranks)) {
      expect(rankLabel(rank, (key) => translate('en', key))).toBe(rank);
    }
  });
});

describe('armorLocationLabel', () => {
  const t = (key: MessageKey) => `T:${key}`;

  test('translates built-in locations and passes custom text through', () => {
    expect(armorLocationLabel('Torso', t)).toBe('T:armor.location.Torso');
    expect(armorLocationLabel('Tail', t)).toBe('Tail');
  });

  test('English labels match the stored values', () => {
    for (const location of Object.values(ArmorLocations)) {
      expect(armorLocationLabel(location, (key) => translate('en', key))).toBe(location);
    }
  });
});

describe('skillNameToStore', () => {
  const de = (key: MessageKey) => translate('de', key);

  test('maps an exact translated core skill back to its stock English name', () => {
    expect(skillNameToStore('Überreden', de)).toBe('Persuasion');
    expect(skillNameToStore('Allgemeinwissen', de)).toBe('Common Knowledge');
  });

  test('keeps any other text as typed', () => {
    for (const name of ['Überredenaasd', 'überreden', 'Überreden ', 'Fighting', 'Notice', '']) {
      expect(skillNameToStore(name, de)).toBe(name);
    }
  });

  test('round-trips with traitLabel', () => {
    for (const stock of Object.values(CoreSkills)) {
      expect(skillNameToStore(traitLabel('skill', stock, de), de)).toBe(stock);
    }
  });
});

describe('traitLabel', () => {
  const t = (key: MessageKey) => `T:${key}`;

  test('translates the five core skills', () => {
    expect(traitLabel('skill', 'Athletics', t)).toBe('T:trait.skill.Athletics');
    expect(traitLabel('skill', 'Common Knowledge', t)).toBe('T:trait.skill.CommonKnowledge');
    expect(traitLabel('skill', 'Notice', t)).toBe('T:trait.skill.Notice');
    expect(traitLabel('skill', 'Persuasion', t)).toBe('T:trait.skill.Persuasion');
    expect(traitLabel('skill', 'Stealth', t)).toBe('T:trait.skill.Stealth');
  });

  test('leaves other or altered skill names alone', () => {
    for (const name of ['athletics', 'Athletics ', 'Fighting', 'Agility', '']) {
      expect(traitLabel('skill', name, t)).toBe(name);
    }
  });

  test('translates attributes only as attributes', () => {
    expect(traitLabel('attribute', 'Vigor', t)).toBe('T:trait.attribute.Vigor');
    expect(traitLabel('attribute', 'Notice', t)).toBe('Notice');
  });
});
