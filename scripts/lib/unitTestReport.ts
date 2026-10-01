// JUnit normalization and the unit-test ownership artifact (DESIGN.md §4.9, cross-phase CI contract).
// Pure functions with no file-system access; scripts/report-unit-tests.ts supplies the real files.
//
// Vitest writes each test case as classname="<file>" name="<suite> > <nested suite> > <test>".
// Normalization moves the suites into the classname so it carries both the repository-relative
// file path and the suite name, which is what the statistics Lambda attributes by:
//   classname="tests/unit/a.test.ts > Suite > Nested"  name="test"  file="tests/unit/a.test.ts"

export const OWNERSHIP_SCHEMA_VERSION = 1;
const SEPARATOR = ' > ';

export interface OwnershipArtifact {
  schemaVersion: typeof OWNERSHIP_SCHEMA_VERSION;
  /** Null only outside CI, where there is no pipeline. */
  pipelineId: number | null;
  sha: string | null;
  owners: Record<string, string>;
}

export interface NormalizedReport {
  xml: string;
  /** Distinct repository-relative test files found in the report. */
  files: string[];
  /** file > suite > test identities that appear more than once. */
  duplicates: string[];
}

/** Rewrites every `<testcase>` start tag; everything else in the document is left untouched. */
export function normalizeJUnit(xml: string, rootDir: string): NormalizedReport {
  const files = new Set<string>();
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  const normalized = xml.replace(/<testcase\b([^>]*?)(\s*\/?)>/g, (tag, rawAttributes: string, close: string) => {
    const attributes = parseAttributes(rawAttributes);
    const classname = attributes.get('classname');
    const name = attributes.get('name');
    if (classname === undefined || name === undefined) return tag;

    // Splitting the classname as well as the name makes normalization idempotent.
    const [classFile = '', ...classSuites] = classname.split(SEPARATOR);
    const nameParts = name.split(SEPARATOR);
    const title = nameParts.pop() ?? '';
    const suites = [...classSuites, ...nameParts];
    const file = toRepoRelative(attributes.get('file') ?? classFile, rootDir);

    const identity = [file, ...suites, title].join(SEPARATOR);
    if (seen.has(identity)) duplicates.add(identity);
    seen.add(identity);
    files.add(file);

    attributes.set('classname', [file, ...suites].join(SEPARATOR));
    attributes.set('name', title);
    attributes.set('file', file);
    return `<testcase${formatAttributes(attributes)}${close}>`;
  });

  return { xml: normalized, files: [...files].sort(), duplicates: [...duplicates].sort() };
}

/** Validates tests/test-owners.json: an object mapping test-file paths to GitLab usernames. */
export function parseOwners(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('tests/test-owners.json must be an object mapping test files to usernames');
  }
  for (const [file, owner] of Object.entries(raw)) {
    if (typeof owner !== 'string' || !owner.trim()) {
      throw new Error(`tests/test-owners.json: owner of ${file} must be a non-empty username`);
    }
  }
  return raw as Record<string, string>;
}

export function buildOwnershipArtifact(
  owners: Record<string, string>,
  pipelineId: number | null,
  sha: string | null,
): OwnershipArtifact {
  return { schemaVersion: OWNERSHIP_SCHEMA_VERSION, pipelineId, sha, owners };
}

/** Report files with no owner. They still count toward the project total, as unattributed. */
export function unownedFiles(files: readonly string[], owners: Record<string, string>): string[] {
  return files.filter((file) => !(file in owners));
}

function toRepoRelative(path: string, rootDir: string): string {
  const slashed = path.replaceAll('\\', '/');
  const root = rootDir.replaceAll('\\', '/').replace(/\/+$/, '');
  const relative = slashed.startsWith(`${root}/`) ? slashed.slice(root.length + 1) : slashed;
  return relative.replace(/^\.\//, '');
}

function parseAttributes(raw: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of raw.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes.set(match[1]!, decodeXml(match[2] ?? match[3] ?? ''));
  }
  return attributes;
}

function formatAttributes(attributes: Map<string, string>): string {
  return [...attributes].map(([key, value]) => ` ${key}="${encodeXml(value)}"`).join('');
}

function decodeXml(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi, (entity, body: string) => {
    const lower = body.toLowerCase();
    if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[lower] ?? entity;
  });
}

function encodeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '&#10;');
}
