import { describe, expect, test } from 'bun:test';
import { foundryToCharacter } from './actor';
import { localSamples, testHero } from './fixtures.test-helper';
import { foundryDamage, foundryText } from './text';

describe('foundryText', () => {
  test('paragraphs become lines', () => {
    expect(foundryText('<p>Hello</p><p>World</p>')).toBe('Hello\nWorld');
  });

  test('enricher link becomes its label', () => {
    expect(foundryText('adds +2 to @UUID[Compendium.x.y]{Soak rolls}.')).toBe(
      'adds +2 to Soak rolls.',
    );
  });

  test('enricher link without label is dropped', () => {
    expect(foundryText('see @UUID[Actor.abc] now')).toBe('see now');
  });

  test('other enrichers keep their label', () => {
    expect(foundryText('@Compendium[a.b.c]{Label}')).toBe('Label');
  });

  test('inline rolls become their formula or label', () => {
    expect(foundryText('deals [[/r 2d6]] damage')).toBe('deals 2d6 damage');
    expect(foundryText('roll [[1d6]] or [[/roll 1d8]]{Bite}')).toBe('roll 1d6 or Bite');
  });

  test('entities decoded', () => {
    expect(foundryText('Tom &amp; Jerry&nbsp;x')).toBe('Tom & Jerry x');
  });

  test('typographic and numeric entities decoded', () => {
    expect(
      foundryText('Caroom&rsquo;s &ldquo;x&rdquo; &mdash; &minus;1&hellip; &#8217;&#x2019;'),
    ).toBe('Caroom’s “x” — −1… ’’');
  });

  test('samples leave no entities behind', async () => {
    for (const actor of [testHero(), ...(await localSamples())]) {
      expect(JSON.stringify(foundryToCharacter(actor))).not.toMatch(/&[#\w]+;/);
    }
  });

  test('empty or non-text gives undefined', () => {
    for (const value of ['<p></p>', '', undefined, 5]) expect(foundryText(value)).toBeUndefined();
  });

  test('line breaks kept, runs of blank lines collapsed', () => {
    expect(foundryText('a<br>b<br/>c')).toBe('a\nb\nc');
    expect(foundryText('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
  });
});

describe('foundryDamage', () => {
  test('attribute references become names', () => {
    expect(foundryDamage('@str+d4')).toBe('Str+d4');
    expect(foundryDamage('@agi+@vig')).toBe('Agi+Vig');
  });

  test('plain dice unchanged', () => {
    expect(foundryDamage('2d6')).toBe('2d6');
  });

  test('empty gives undefined', () => {
    expect(foundryDamage('')).toBeUndefined();
  });
});
