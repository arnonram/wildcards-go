import { expect, test } from 'bun:test';
import { MARKER, readJunit, readLcov, summarize } from './test-summary';

/** What `bun test --reporter=junit` writes for one failing, one skipped and one passing test. */
const JUNIT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" assertions="1" failures="1" skipped="1" time="0.25">
  <testsuite name="x.test.ts" file="x.test.ts" tests="3" assertions="1" failures="1" skipped="1" time="0.1">
    <testsuite name="group" file="x.test.ts" line="2" tests="1" assertions="1" failures="1" skipped="0" time="0">
      <testcase name="fails &lt;here&gt; &amp; &quot;there&quot;" classname="group" time="0.0001" file="x.test.ts" line="2" assertions="1">
        <failure type="AssertionError" message="expect(received).toBe(expected)&#10;&#10;Expected: 2&#10;Received: 1&#10;">AssertionError</failure>
      </testcase>
    </testsuite>
    <testcase name="skipped one" classname="" time="0" file="x.test.ts" line="3" assertions="0">
      <skipped />
    </testcase>
    <testcase name="passes" classname="" time="0.000005" file="x.test.ts" line="4" assertions="0" />
  </testsuite>
</testsuites>`;

const LCOV = `TN:
SF:a.ts
FNF:2
FNH:1
LF:10
LH:5
end_of_record
TN:
SF:b.ts
FNF:2
FNH:2
LF:10
LH:10
end_of_record
`;

test('reads totals and failures, decoding entities', () => {
  const { totals, failed } = readJunit(JUNIT);
  expect(totals).toEqual({ tests: 3, failures: 1, skipped: 1, seconds: 0.25 });
  expect(failed).toEqual([
    {
      name: 'group › fails <here> & "there"',
      file: 'x.test.ts',
      line: '2',
      message: 'expect(received).toBe(expected)\n\nExpected: 2\nReceived: 1',
    },
  ]);
});

test('sums lcov totals and keeps each file', () => {
  expect(readLcov(LCOV)).toEqual({
    lines: [15, 20],
    functions: [3, 4],
    files: [
      { file: 'a.ts', lines: [5, 10] },
      { file: 'b.ts', lines: [10, 10] },
    ],
  });
});

test('the summary starts with the marker and lists failures and coverage', () => {
  const summary = summarize(JUNIT, LCOV);
  expect(summary.startsWith(MARKER)).toBe(true);
  expect(summary).toContain('## ❌ Tests');
  expect(summary).toContain('| 1 | 1 | 1 | 0.3s |');
  expect(summary).toContain('**group › fails &lt;here&gt; &amp; "there"** (`x.test.ts:2`)');
  expect(summary).toContain('Lines **75.0%** · Functions **75.0%**');
  // Lowest coverage first.
  expect(summary.indexOf('`a.ts`')).toBeLessThan(summary.indexOf('`b.ts`'));
});

test('a passing run without coverage', () => {
  const passing = JUNIT.replace('failures="1"', 'failures="0"').replace(
    /<testcase[^>]*>\s*<failure[\s\S]*?<\/testcase>/,
    '',
  );
  const summary = summarize(passing, null);
  expect(summary).toContain('## ✅ Tests');
  expect(summary).not.toContain('## Coverage');
});

test('a message cannot break out of its code block', () => {
  const sneaky = JUNIT.replace('Received: 1', 'Received: ```\n# injected');
  expect(summarize(sneaky, null)).not.toContain('```\n# injected');
});
