import { describe, expect, it, vi } from 'vitest';
import {
  MESSAGES,
  attributeCommits,
  attributeIssues,
  collectUnitTests,
  countUnitTests,
  selectUnitTestPipeline,
  validateOwnership,
  type GitLabReader,
  type OwnershipResult,
} from '../../../server/stats/aggregate.ts';
import { parseContributorMap } from '../../../server/stats/contributors.ts';
import { GitLabError, type GitLabCommit, type GitLabIssue, type GitLabTestCase } from '../../../server/stats/gitlabClient.ts';
import { ROSTER } from '../../../server/stats/roster.ts';

const aliases = (emails: string[], names: string[] = [], userId: number | null = null) => ({ userId, emails, names });

const CONTRIBUTORS = parseContributorMap(
  JSON.stringify({
    jiakl: aliases(['jia@example.com'], ['Jia L'], 101),
    atb2923: aliases(['alex@example.com']),
    'j.enzosagun': aliases(['enzo@example.com', 'enzo@laptop.local'], ['Enzo S']),
    nifemisoyemi: aliases(['nifemi@example.com']),
    lukeyawn: aliases(['luke@example.com']),
  }),
  ROSTER,
);

const IDS = { jiakl: 101, atb2923: 102, 'j.enzosagun': 103, nifemisoyemi: 104, lukeyawn: 105 };

const commit = (id: string, author_email: string, author_name = 'Someone'): GitLabCommit => ({
  id,
  author_email,
  author_name,
  parent_ids: [],
});

const issue = (id: number, authorId: number | null): GitLabIssue => ({
  id,
  iid: id,
  state: 'opened',
  author: authorId === null ? null : { id: authorId, username: `user${authorId}` },
});

const testCase = (classname: string, name: string, status = 'success'): GitLabTestCase => ({ classname, name, status });

const report = (cases: GitLabTestCase[], suiteName = 'unit') => ({
  total_count: cases.length,
  skipped_count: 0,
  test_suites: [{ name: suiteName, total_count: cases.length, skipped_count: 0, test_cases: cases }],
});

describe('commit attribution', () => {
  it('counts each SHA once and attributes by email alias, then exact name alias', () => {
    const result = attributeCommits(
      [
        commit('a', 'ENZO@example.com'),
        commit('a', 'enzo@example.com'), // duplicate SHA
        commit('b', 'enzo@laptop.local'),
        commit('c', 'unknown@example.com', 'Jia L'),
        commit('d', 'bot@example.com', 'jia l'), // names match exactly, not approximately
        commit('e', 'outsider@example.com', 'Outsider'),
      ],
      CONTRIBUTORS,
      ROSTER,
    );

    expect(result.total).toBe(5);
    expect(result.members).toEqual({ jiakl: 1, atb2923: 0, 'j.enzosagun': 2, nifemisoyemi: 0, lukeyawn: 0 });
    expect(result.unattributed).toBe(2);
  });

  it('reconciles: members plus unattributed equal the total', () => {
    const result = attributeCommits(
      [commit('a', 'luke@example.com'), commit('b', 'x@example.com'), commit('c', 'alex@example.com')],
      CONTRIBUTORS,
      ROSTER,
    );
    const memberSum = Object.values(result.members!).reduce((sum, n) => sum + n, 0);
    expect(memberSum + result.unattributed!).toBe(result.total);
  });

  it('keeps the total but withholds the split when the contributor map is missing', () => {
    const result = attributeCommits([commit('a', 'luke@example.com')], parseContributorMap(undefined, ROSTER), ROSTER);
    expect(result).toEqual({
      total: 1,
      members: null,
      unattributed: null,
      attributionMessage: 'CONTRIBUTOR_MAP is not configured.',
    });
  });
});

describe('issue attribution', () => {
  it('counts by author, never assignee, and puts non-roster authors in unattributed', () => {
    const assignedToEnzo = { ...issue(3, 999), assignees: [{ id: 103 }] } as GitLabIssue;
    const result = attributeIssues(
      [issue(1, 101), issue(1, 101), issue(2, 103), assignedToEnzo, issue(4, null)],
      IDS,
      CONTRIBUTORS,
      ROSTER,
    );

    expect(result.total).toBe(4);
    expect(result.members).toEqual({ jiakl: 1, atb2923: 0, 'j.enzosagun': 1, nifemisoyemi: 0, lukeyawn: 0 });
    expect(result.unattributed).toBe(2);
  });

  it('falls back to a verified map ID when GitLab cannot resolve a username', () => {
    const result = attributeIssues([issue(1, 101)], { ...IDS, jiakl: null }, CONTRIBUTORS, ROSTER);
    expect(result.members?.jiakl).toBe(1);
  });

  it('withholds the split when an account cannot be resolved', () => {
    const result = attributeIssues([issue(1, 101)], { ...IDS, lukeyawn: null }, CONTRIBUTORS, ROSTER);
    expect(result).toMatchObject({ total: 1, members: null, attributionMessage: MESSAGES.unresolvedAccount });
  });

  it('withholds the split when GitLab and the map disagree on an ID', () => {
    const result = attributeIssues([issue(1, 101)], { ...IDS, jiakl: 555 }, CONTRIBUTORS, ROSTER);
    expect(result).toMatchObject({ members: null, attributionMessage: MESSAGES.idMismatch });
  });
});

describe('unit-test counting', () => {
  const PIPELINE = { id: 50, sha: 'abc123' };
  const owners = (map: Record<string, string>): OwnershipResult =>
    validateOwnership({ schemaVersion: 1, pipelineId: 50, sha: 'abc123', owners: map }, PIPELINE);

  it('counts distinct cases, parameterized cases separately and skipped cases apart', () => {
    const result = countUnitTests(
      report([
        testCase('tests/unit/a.test.ts', 'suite > adds 1 + 1'),
        testCase('tests/unit/a.test.ts', 'suite > adds 2 + 2'),
        testCase('tests/unit/a.test.ts', 'suite > adds 2 + 2'), // duplicate identity
        testCase('tests/unit/a.test.ts', 'suite > later', 'skipped'),
      ]),
      owners({ 'tests/unit/a.test.ts': 'jiakl' }),
      ROSTER,
    );

    expect(result?.total).toEqual({ executed: 2, skipped: 1 });
    expect(result?.members?.jiakl).toEqual({ executed: 2, skipped: 1 });
  });

  it('attributes by file prefix, and counts unowned or non-roster files as unattributed', () => {
    const result = countUnitTests(
      report([
        testCase('tests/unit/a.test.ts', 'x'),
        testCase('tests/unit/a.test.tsx', 'x'), // must not match the shorter a.test.ts owner
        testCase('tests/unit/b.test.ts > Suite', 'y'), // normalized classname: file + suite
        testCase('tests/unit/c.test.ts', 'z'),
      ]),
      owners({
        'tests/unit/a.test.ts': 'jiakl',
        'tests/unit/a.test.tsx': 'atb2923',
        'tests/unit/b.test.ts': 'lukeyawn',
        'tests/unit/c.test.ts': 'not-on-roster',
      }),
      ROSTER,
    );

    expect(result?.members).toMatchObject({
      jiakl: { executed: 1, skipped: 0 },
      atb2923: { executed: 1, skipped: 0 },
      lukeyawn: { executed: 1, skipped: 0 },
      'j.enzosagun': { executed: 0, skipped: 0 },
    });
    expect(result?.unattributed).toEqual({ executed: 1, skipped: 0 });
  });

  it('only counts the unit job suite, never acceptance results', () => {
    const result = countUnitTests(
      {
        total_count: 2,
        skipped_count: 0,
        test_suites: [
          { name: 'unit', total_count: 1, skipped_count: 0, test_cases: [testCase('tests/unit/a.test.ts', 'x')] },
          { name: 'acceptance', total_count: 1, skipped_count: 0, test_cases: [testCase('e2e.spec.ts', 'y')] },
        ],
      },
      owners({}),
      ROSTER,
    );
    expect(result?.total).toEqual({ executed: 1, skipped: 0 });
  });

  it('distinguishes a real zero-case report from a missing one', () => {
    expect(countUnitTests(report([]), owners({}), ROSTER)?.total).toEqual({ executed: 0, skipped: 0 });
    expect(countUnitTests(report([], 'acceptance'), owners({}), ROSTER)).toBeNull();
  });

  it('withholds per-member counts when the ownership artifact is unusable', () => {
    const result = countUnitTests(report([testCase('tests/unit/a.test.ts', 'x')]), { ok: false, message: 'nope' }, ROSTER);
    expect(result).toEqual({
      total: { executed: 1, skipped: 0 },
      members: null,
      unattributed: null,
      attributionMessage: 'nope',
    });
  });

  it('accepts ownership only from the same pipeline and commit with schema version 1', () => {
    const base = { schemaVersion: 1, pipelineId: 50, sha: 'abc123', owners: {} };
    expect(validateOwnership(base, PIPELINE).ok).toBe(true);
    expect(validateOwnership({ ...base, schemaVersion: 2 }, PIPELINE)).toEqual({
      ok: false,
      message: MESSAGES.ownershipVersion,
    });
    expect(validateOwnership({ ...base, pipelineId: 49 }, PIPELINE)).toEqual({
      ok: false,
      message: MESSAGES.ownershipMismatch,
    });
    expect(validateOwnership({ ...base, sha: 'other' }, PIPELINE).ok).toBe(false);
    expect(validateOwnership({ ...base, owners: { a: 1 } }, PIPELINE)).toEqual({
      ok: false,
      message: MESSAGES.badOwnership,
    });
    expect(validateOwnership('not json object', PIPELINE).ok).toBe(false);
  });
});

function fakeReader(overrides: Partial<GitLabReader> = {}): GitLabReader {
  return {
    getProject: vi.fn(),
    resolveUserIds: vi.fn(),
    listCommits: vi.fn(),
    listIssues: vi.fn(),
    listRecentPipelines: vi.fn(async () => [
      { id: 30, sha: 's30', ref: 'main', status: 'failed', web_url: 'https://gitlab.com/p/30' },
      { id: 29, sha: 's29', ref: 'main', status: 'failed', web_url: 'https://gitlab.com/p/29' },
      { id: 28, sha: 's28', ref: 'main', status: 'success', web_url: 'https://gitlab.com/p/28' },
    ]),
    listPipelineJobs: vi.fn(async (_projectId: number, pipelineId: number) => {
      if (pipelineId === 30) return [{ id: 300, name: 'unit', status: 'failed' }];
      if (pipelineId === 29) {
        return [
          { id: 290, name: 'unit', status: 'success' },
          { id: 291, name: 'acceptance', status: 'failed' },
        ];
      }
      return [{ id: 280, name: 'unit', status: 'success' }];
    }),
    getTestReport: vi.fn(async () => report([testCase('tests/unit/a.test.ts', 'x')])),
    getJobArtifactJson: vi.fn(async () => ({
      schemaVersion: 1,
      pipelineId: 29,
      sha: 's29',
      owners: { 'tests/unit/a.test.ts': 'j.enzosagun' },
    })),
    ...overrides,
  };
}

describe('unit-test snapshot selection', () => {
  it('skips a pipeline whose unit job failed but accepts one where only acceptance failed', async () => {
    const reader = fakeReader();
    const selected = await selectUnitTestPipeline(reader, 1, 'main');

    expect(selected?.pipeline.id).toBe(29);
    expect(selected?.unitJob.id).toBe(290);
    expect(reader.listRecentPipelines).toHaveBeenCalledWith(1, 'main', 20);
  });

  it('examines at most 20 pipelines', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ id: 100 - i, sha: 's', ref: 'main', status: 'failed', web_url: '' }));
    const reader = fakeReader({
      listRecentPipelines: vi.fn(async () => many),
      listPipelineJobs: vi.fn(async () => [{ id: 1, name: 'unit', status: 'failed' }]),
    });

    expect(await selectUnitTestPipeline(reader, 1, 'main')).toBeNull();
    expect(reader.listPipelineJobs).toHaveBeenCalledTimes(20);
  });

  it("reads the selected pipeline's report and its unit job's ownership artifact", async () => {
    const reader = fakeReader();
    const snapshot = await collectUnitTests(reader, 1, 'main', ROSTER);

    expect(reader.getTestReport).toHaveBeenCalledWith(1, 29);
    expect(reader.getJobArtifactJson).toHaveBeenCalledWith(1, 290, 'reports/unit-test-owners.json');
    expect(snapshot).toMatchObject({
      kind: 'ok',
      pipeline: { id: 29, sha: 's29', url: 'https://gitlab.com/p/29' },
      counts: { total: { executed: 1, skipped: 0 }, members: { 'j.enzosagun': { executed: 1, skipped: 0 } } },
    });
  });

  it('treats a missing ownership artifact as per-member unavailable, keeping the total', async () => {
    const reader = fakeReader({
      getJobArtifactJson: vi.fn(async () => {
        throw new GitLabError('http', '/projects/1/jobs/290/artifacts/x', 404);
      }),
    });
    const snapshot = await collectUnitTests(reader, 1, 'main', ROSTER);

    expect(snapshot).toMatchObject({
      kind: 'ok',
      counts: { total: { executed: 1 }, members: null, attributionMessage: MESSAGES.noOwnership },
    });
  });

  it('fails the refresh on other artifact errors so a stale value can be shown', async () => {
    const reader = fakeReader({
      getJobArtifactJson: vi.fn(async () => {
        throw new GitLabError('timeout', '/projects/1/jobs/290/artifacts/x');
      }),
    });
    await expect(collectUnitTests(reader, 1, 'main', ROSTER)).rejects.toBeInstanceOf(GitLabError);
  });

  it('reports no qualifying pipeline and a missing report as unavailable reasons', async () => {
    const noPipeline = fakeReader({ listPipelineJobs: vi.fn(async () => []) });
    expect(await collectUnitTests(noPipeline, 1, 'main', ROSTER)).toEqual({ kind: 'none', message: MESSAGES.noPipeline });

    const noReport = fakeReader({ getTestReport: vi.fn(async () => report([], 'acceptance')) });
    expect(await collectUnitTests(noReport, 1, 'main', ROSTER)).toEqual({ kind: 'none', message: MESSAGES.noReport });
  });
});
