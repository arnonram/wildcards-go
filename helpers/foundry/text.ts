const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};

/** Foundry rich text (HTML with `@UUID[...]{Label}` links) as plain text. */
export function foundryText(html: unknown): string | undefined {
  if (typeof html !== 'string') return undefined;
  const text = html
    .replace(/@\w+\[[^\]]*\](?:\{([^}]*)\})?/g, (_, label?: string) => label ?? '')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
}

export function foundryDamage(damage: unknown): string | undefined {
  if (typeof damage !== 'string' || !damage) return undefined;
  return damage.replace(
    /@(\w)(\w*)/g,
    (_, first: string, rest: string) => first.toUpperCase() + rest,
  );
}
