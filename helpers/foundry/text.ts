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
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup2: '²',
  sup3: '³',
  deg: '°',
  szlig: 'ß',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
};

// Accented letters: &eacute; → e + combining acute → é.
const ACCENTS: Record<string, string> = {
  acute: '\u0301',
  grave: '\u0300',
  circ: '\u0302',
  uml: '\u0308',
  tilde: '\u0303',
  cedil: '\u0327',
  ring: '\u030a',
};

function decodeNamed(entity: string, name: string): string {
  if (ENTITIES[name] !== undefined) return ENTITIES[name];
  const accent = /^([a-z])(acute|grave|circ|uml|tilde|cedil|ring)$/i.exec(name);
  return accent ? (accent[1] + ACCENTS[accent[2]]).normalize('NFC') : entity;
}

function decodeEntity(entity: string, body: string): string {
  if (body[0] !== '#') return decodeNamed(entity, body);
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
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, decodeEntity)
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
