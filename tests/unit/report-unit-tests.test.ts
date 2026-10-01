import { describe, expect, it } from 'vitest';
import {
  buildOwnershipArtifact,
  normalizeJUnit,
  parseOwners,
  unownedFiles,
} from '../../scripts/lib/unitTestReport.ts';

const ROOT = '/builds/nifemisoyemi/cs373-fall-2026-18';

const junit = (...cases: string[]) =>
  `<?xml version="1.0" encoding="UTF-8" ?>\n<testsuites name="vitest tests">\n<testsuite name="x">\n${cases.join('\n')}\n</testsuite>\n</testsuites>\n`;

describe('JUnit normalization', () => {
  it('moves suite names into the classname next to the file path', () => {
    const { xml } = normalizeJUnit(
      junit('<testcase classname="tests/unit/a.test.ts" name="Listing &gt; filters &gt; matches case-insensitively" time="0.1">'),
      ROOT,
    );
    expect(xml).toContain(
      '<testcase classname="tests/unit/a.test.ts &gt; Listing &gt; filters" name="matches case-insensitively" time="0.1" file="tests/unit/a.test.ts">',
    );
  });

  it('keeps top-level tests (no suite) with the file as the classname', () => {
    const { xml } = normalizeJUnit(junit('<testcase classname="tests/unit/a.test.ts" name="works"/>'), ROOT);
    expect(xml).toContain('<testcase classname="tests/unit/a.test.ts" name="works" file="tests/unit/a.test.ts"/>');
  });

  it('makes absolute and Windows-style paths repository-relative', () => {
    const { files } = normalizeJUnit(
      junit(
        `<testcase classname="${ROOT}/tests/unit/a.test.ts" name="S &gt; t">`,
        '<testcase classname="tests\\unit\\b.test.ts" name="S &gt; t">',
        '<testcase classname="./tests/unit/c.test.ts" name="S &gt; t">',
      ),
      ROOT,
    );
    expect(files).toEqual(['tests/unit/a.test.ts', 'tests/unit/b.test.ts', 'tests/unit/c.test.ts']);
  });

  it('is idempotent, so running the report step twice changes nothing', () => {
    const once = normalizeJUnit(junit('<testcase classname="tests/unit/a.test.ts" name="A &gt; B &gt; t">'), ROOT).xml;
    expect(normalizeJUnit(once, ROOT).xml).toBe(once);
  });

  it('preserves escaping of special characters and leaves the rest of the document alone', () => {
    const input = junit(
      '<testcase classname="tests/unit/a.test.ts" name="S &gt; handles &quot;quotes&quot; &amp; &lt;tags&gt;">',
      '<failure message="expected &lt;div&gt;">trace</failure>',
      '</testcase>',
    );
    const { xml } = normalizeJUnit(input, ROOT);
    expect(xml).toContain('name="handles &quot;quotes&quot; &amp; &lt;tags&gt;"');
    expect(xml).toContain('<failure message="expected &lt;div&gt;">trace</failure>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" ?>\n<testsuites name="vitest tests">')).toBe(true);
  });

  it('reports identities that are not unique within a suite', () => {
    const { duplicates } = normalizeJUnit(
      junit(
        '<testcase classname="tests/unit/a.test.ts" name="S &gt; adds 1">',
        '<testcase classname="tests/unit/a.test.ts" name="S &gt; adds 1">',
        '<testcase classname="tests/unit/a.test.ts" name="S &gt; adds 2">', // parameter label differs
        '<testcase classname="tests/unit/a.test.ts" name="Other &gt; adds 1">', // different suite
      ),
      ROOT,
    );
    expect(duplicates).toEqual(['tests/unit/a.test.ts > S > adds 1']);
  });
});

describe('ownership artifact', () => {
  it('stamps owners with schema version 1, the pipeline ID and the commit SHA', () => {
    expect(buildOwnershipArtifact({ 'tests/unit/a.test.ts': 'jiakl' }, 123, 'abc')).toEqual({
      schemaVersion: 1,
      pipelineId: 123,
      sha: 'abc',
      owners: { 'tests/unit/a.test.ts': 'jiakl' },
    });
  });

  it('validates tests/test-owners.json', () => {
    expect(parseOwners({ 'tests/unit/a.test.ts': 'jiakl' })).toEqual({ 'tests/unit/a.test.ts': 'jiakl' });
    expect(() => parseOwners([])).toThrow(/must be an object/);
    expect(() => parseOwners({ 'tests/unit/a.test.ts': '' })).toThrow(/a\.test\.ts/);
    expect(() => parseOwners({ 'tests/unit/a.test.ts': 7 })).toThrow();
  });

  it('lists report files that have no owner', () => {
    expect(unownedFiles(['tests/unit/a.test.ts', 'tests/unit/b.test.ts'], { 'tests/unit/a.test.ts': 'jiakl' })).toEqual([
      'tests/unit/b.test.ts',
    ]);
  });
});
