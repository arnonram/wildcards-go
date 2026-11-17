import { describe, expect, test } from 'bun:test';
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

  test('entities decoded', () => {
    expect(foundryText('Tom &amp; Jerry&nbsp;x')).toBe('Tom & Jerry x');
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
