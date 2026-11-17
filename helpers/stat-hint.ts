import type { MessageKey, TranslateVars } from './i18n';

export const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;

export type HintPart = 'base' | 'size' | 'armor' | 'shield' | 'mod';

/** "5 base, +2 armor, +1 mod": base always, the rest only when they change the total. */
export function statHint(
  parts: [HintPart, number][],
  t: (key: MessageKey, vars?: TranslateVars) => string,
): string {
  return parts
    .filter(([part, value]) => part === 'base' || value !== 0)
    .map(([part, value]) =>
      t(`stat.hint.${part}`, { value: part === 'base' ? value : signed(value) }),
    )
    .join(', ');
}
