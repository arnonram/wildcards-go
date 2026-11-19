const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  minus: '−',
  hellip: '…',
  times: '×',
};

function decodeEntity(entity: string, body: string): string {
  if (body[0] !== '#') return ENTITIES[body] ?? entity;
  const code =
    body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : entity;
}

/** Foundry rich text (HTML with `@UUID[...]{Label}` links) as plain text. */
export function foundryText(html: unknown): string | undefined {
  if (typeof html !== 'string') return undefined;
  const text = html
    .replace(/@\w+\[[^\]]*\](?:\{([^}]*)\})?/g, (_, label?: string) => label ?? '')
    .replace(
      /\[\[(?:\/\w+\s+)?([^\]]*)\]\](?:\{([^}]*)\})?/g,
      (_, formula: string, label?: string) => label ?? formula.trim(),
    )
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
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
