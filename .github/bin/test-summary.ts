/**
 * Turns `bun test`'s JUnit and lcov output into a Markdown summary for CI:
 * the job summary on every run, and a comment on same-repo pull requests.
 *
 *   bun .github/bin/test-summary.ts junit.xml coverage/lcov.info > summary.md
 *
 * Bun writes both files in a fixed shape, so this reads them with regexes
 * rather than pulling in an XML parser.
 */

/** Marks the PR comment so CI updates it instead of adding another. */
export const MARKER = '<!-- wcg-test-summary -->';

const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
  '&#10;': '\n',
};

function decode(text: string): string {
  return text.replace(/&(lt|gt|quot|apos|amp|#10);/g, (entity) => ENTITIES[entity]);
}

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, key, value] of tag.matchAll(/(\w+)="([^"]*)"/g)) found[key] = decode(value);
  return found;
}

export type Failure = { name: string; file: string; line: string; message: string };
export type TestTotals = { tests: number; failures: number; skipped: number; seconds: number };

export function readJunit(xml: string): { totals: TestTotals; failed: Failure[] } {
  const root = attributes(xml.match(/<testsuites\b[^>]*>/)?.[0] ?? '');
  const failed = [...xml.matchAll(/<testcase\b([^>]*)>\s*<failure\b([^>]*)>/g)].map(
    ([, testcase, failure]) => {
      const test = attributes(testcase);
      return {
        name: [test.classname, test.name].filter(Boolean).join(' › '),
        file: test.file ?? '',
        line: test.line ?? '',
        message: attributes(failure).message?.trim() ?? '',
      };
    },
  );
  return {
    totals: {
      tests: Number(root.tests ?? 0),
      failures: Number(root.failures ?? 0),
      skipped: Number(root.skipped ?? 0),
      seconds: Number(root.time ?? 0),
    },
    failed,
  };
}

export type FileCoverage = { file: string; lines: [hit: number, found: number] };
export type Coverage = {
  lines: [hit: number, found: number];
  functions: [hit: number, found: number];
  files: FileCoverage[];
};

export function readLcov(lcov: string): Coverage {
  const coverage: Coverage = { lines: [0, 0], functions: [0, 0], files: [] };
  for (const record of lcov.split('end_of_record')) {
    const value = (key: string) =>
      Number(record.match(new RegExp(`^${key}:(\\d+)`, 'm'))?.[1] ?? 0);
    const file = record.match(/^SF:(.+)$/m)?.[1];
    if (!file) continue;
    const lines: [number, number] = [value('LH'), value('LF')];
    coverage.lines[0] += lines[0];
    coverage.lines[1] += lines[1];
    coverage.functions[0] += value('FNH');
    coverage.functions[1] += value('FNF');
    coverage.files.push({ file, lines });
  }
  return coverage;
}

function percent([hit, found]: [number, number]): string {
  return found === 0 ? '–' : `${((hit / found) * 100).toFixed(1)}%`;
}

/** Keeps a test's message from breaking out of its code block. */
function fenced(text: string): string {
  return ['```', text.replaceAll('```', "'''"), '```'].join('\n');
}

/** A test name as Markdown text: GitHub would read `<here>` as an HTML tag and hide it. */
function plain(text: string): string {
  return text.replace(/[&<>*_`\\]/g, (char) =>
    char === '&' ? '&amp;' : char === '<' ? '&lt;' : char === '>' ? '&gt;' : `\\${char}`,
  );
}

export function summarize(junit: string, lcov: string | null): string {
  const { totals, failed } = readJunit(junit);
  const passed = totals.tests - totals.failures - totals.skipped;
  const out = [
    MARKER,
    `## ${totals.failures ? '❌' : '✅'} Tests`,
    '',
    '| Passed | Failed | Skipped | Time |',
    '| -----: | -----: | ------: | ---: |',
    `| ${passed} | ${totals.failures} | ${totals.skipped} | ${totals.seconds.toFixed(1)}s |`,
  ];

  for (const failure of failed) {
    out.push(
      '',
      `**${plain(failure.name)}** (\`${failure.file}:${failure.line}\`)`,
      '',
      fenced(failure.message),
    );
  }

  if (lcov) {
    const coverage = readLcov(lcov);
    const byLines = [...coverage.files].sort(
      (a, b) => a.lines[0] / (a.lines[1] || 1) - b.lines[0] / (b.lines[1] || 1),
    );
    out.push(
      '',
      '## Coverage',
      '',
      `Lines **${percent(coverage.lines)}** · Functions **${percent(coverage.functions)}**`,
      '',
      '<sub>Counts only files the tests load.</sub>',
      '',
      '<details><summary>By file, lowest first</summary>',
      '',
      '| File | Lines |',
      '| ---- | ----: |',
      ...byLines.map(({ file, lines }) => `| \`${file}\` | ${percent(lines)} |`),
      '',
      '</details>',
    );
  }
  return `${out.join('\n')}\n`;
}

if (import.meta.main) {
  const [junitPath, lcovPath] = process.argv.slice(2);
  if (!junitPath) {
    console.error('Usage: bun .github/bin/test-summary.ts <junit.xml> [lcov.info]');
    process.exit(1);
  }
  const lcov =
    lcovPath && (await Bun.file(lcovPath).exists()) ? await Bun.file(lcovPath).text() : null;
  process.stdout.write(summarize(await Bun.file(junitPath).text(), lcov));
}
