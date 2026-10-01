import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitLabReader } from '../../../server/stats/aggregate.ts';
import { createCoalescingCache } from '../../../server/stats/cache.ts';
import { GitLabError } from '../../../server/stats/gitlabClient.ts';
import { createStatsService } from '../../../server/stats/service.ts';
import type { StatsEnvelope } from '../../../src/types/stats.ts';

const CONTRIBUTOR_MAP = JSON.stringify({
  jiakl: { emails: ['jia@example.com'], names: [] },
  atb2923: { emails: ['alex@example.com'], names: [] },
  'j.enzosagun': { emails: ['enzo@example.com'], names: [] },
  nifemisoyemi: { emails: ['nifemi@example.com'], names: [] },
  lukeyawn: { emails: ['luke@example.com'], names: [] },
});

const T0 = Date.parse('2026-09-30T12:00:00Z');

function healthyReader(): GitLabReader {
  return {
    getProject: vi.fn(async () => ({ id: 1, defaultBranch: 'main', pathWithNamespace: 'a/b', webUrl: '' })),
    resolveUserIds: vi.fn(async () => ({ jiakl: 101, atb2923: 102, 'j.enzosagun': 103, nifemisoyemi: 104, lukeyawn: 105 })),
    listCommits: vi.fn(async () => [
      { id: 'c1', author_email: 'enzo@example.com', author_name: 'E', parent_ids: [] },
      { id: 'c2', author_email: 'outsider@example.com', author_name: 'O', parent_ids: [] },
    ]),
    listIssues: vi.fn(async () => [{ id: 1, iid: 1, state: 'closed', author: { id: 101, username: 'jiakl' } }]),
    listRecentPipelines: vi.fn(async () => [{ id: 9, sha: 'sha9', ref: 'main', status: 'success', web_url: 'https://gitlab.com/p/9' }]),
    listPipelineJobs: vi.fn(async () => [{ id: 90, name: 'unit', status: 'success' }]),
    getTestReport: vi.fn(async () => ({
      total_count: 2,
      skipped_count: 1,
      test_suites: [
        {
          name: 'unit',
          total_count: 2,
          skipped_count: 1,
          test_cases: [
            { classname: 'tests/unit/a.test.ts', name: 'a', status: 'success' },
            { classname: 'tests/unit/a.test.ts', name: 'b', status: 'skipped' },
          ],
        },
      ],
    })),
    getJobArtifactJson: vi.fn(async () => ({
      schemaVersion: 1,
      pipelineId: 9,
      sha: 'sha9',
      owners: { 'tests/unit/a.test.ts': 'lukeyawn' },
    })),
  };
}

function setup(reader: GitLabReader = healthyReader(), { contributorMap = CONTRIBUTOR_MAP as string | undefined } = {}) {
  let now = T0;
  const service = createStatsService({
    config: { gitlabToken: 'glpat-secret', gitlabProjectPath: 'nifemisoyemi/cs373-fall-2026-18', contributorMap },
    createGitLab: () => reader,
    now: () => now,
  });
  return { service, reader, advance: (ms: number) => (now += ms) };
}

const member = (envelope: StatsEnvelope, username: string) => envelope.members.find((m) => m.username === username)!;

function failEverything(reader: GitLabReader) {
  const fail = async () => {
    throw new GitLabError('http', '/x', 503);
  };
  for (const key of Object.keys(reader) as (keyof GitLabReader)[]) vi.mocked(reader[key]).mockImplementation(fail);
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('statistics envelope', () => {
  it('returns the full contract with current, reconciling metrics', async () => {
    const envelope = await setup().service.load();
    const asOf = '2026-09-30T12:00:00.000Z';

    expect(envelope).toMatchObject({
      projectPath: 'nifemisoyemi/cs373-fall-2026-18',
      generatedAt: asOf,
      defaultBranch: 'main',
      pipeline: { id: 9, sha: 'sha9', url: 'https://gitlab.com/p/9' },
    });
    expect(envelope.members.map((m) => m.username)).toEqual(['jiakl', 'atb2923', 'j.enzosagun', 'nifemisoyemi', 'lukeyawn']);
    expect(member(envelope, 'j.enzosagun').commits).toEqual({ status: 'current', asOf, value: 1, message: null });
    expect(member(envelope, 'jiakl').issues.value).toBe(1);
    expect(member(envelope, 'lukeyawn').unitTests).toEqual({ status: 'current', asOf, value: 1, skipped: 1, message: null });
    expect(member(envelope, 'atb2923').commits.value).toBe(0); // a real zero, not missing data

    for (const key of ['commits', 'issues', 'unitTests'] as const) {
      const memberSum = envelope.members.reduce((sum, m) => sum + m[key].value!, 0);
      expect(memberSum + envelope.unattributed[key].value!).toBe(envelope.totals[key].value);
    }
    expect(envelope.totals.commits.value).toBe(2);
    expect(envelope.unattributed.commits.value).toBe(1);
  });

  it('marks per-member commits unavailable, not zero, without a contributor map', async () => {
    const envelope = await setup(healthyReader(), { contributorMap: '' }).service.load();

    expect(envelope.totals.commits).toMatchObject({ status: 'current', value: 2 });
    expect(member(envelope, 'j.enzosagun').commits).toEqual({
      status: 'unavailable',
      asOf: null,
      value: null,
      message: 'CONTRIBUTOR_MAP is not configured.',
    });
    expect(envelope.unattributed.commits.status).toBe('unavailable');
    expect(member(envelope, 'jiakl').issues.status).toBe('current');
  });

  it('is unavailable on a cold start when GitLab fails, with no fabricated zeros', async () => {
    const reader = healthyReader();
    failEverything(reader);
    const envelope = await setup(reader).service.load();

    expect(envelope.defaultBranch).toBeNull();
    expect(envelope.pipeline).toBeNull();
    expect(envelope.totals.commits).toEqual({
      status: 'unavailable',
      asOf: null,
      value: null,
      message: 'GitLab statistics are unavailable right now.',
    });
    expect(envelope.members.every((m) => m.unitTests.value === null && m.unitTests.skipped === null)).toBe(true);
  });

  it('never includes the token in the response', async () => {
    expect(JSON.stringify(await setup().service.load())).not.toContain('glpat-secret');
  });
});

describe('caching and stale values', () => {
  it('serves the cached envelope for five minutes, then refreshes', async () => {
    const { service, reader, advance } = setup();
    await service.load();
    advance(4 * 60_000);
    await service.load();
    expect(reader.getProject).toHaveBeenCalledTimes(1);

    advance(61_000);
    const refreshed = await service.load();
    expect(reader.getProject).toHaveBeenCalledTimes(2);
    expect(refreshed.generatedAt).toBe('2026-09-30T12:05:01.000Z');
  });

  it('shows the last good values as stale with their original timestamps after a failure', async () => {
    const { service, reader, advance } = setup();
    await service.load();
    failEverything(reader);
    advance(6 * 60_000);

    const envelope = await service.load();
    expect(envelope.generatedAt).toBe('2026-09-30T12:06:00.000Z');
    expect(envelope.defaultBranch).toBe('main');
    expect(envelope.totals.commits).toEqual({
      status: 'stale',
      asOf: '2026-09-30T12:00:00.000Z',
      value: 2,
      message: 'GitLab is unavailable; showing the last successful value.',
    });
    expect(envelope.pipeline?.id).toBe(9); // still the pipeline behind the stale unit counts
    expect(member(envelope, 'lukeyawn').unitTests).toMatchObject({ status: 'stale', value: 1 });
  });

  it('falls back per source: one failing source does not make the others stale', async () => {
    const { service, reader, advance } = setup();
    await service.load();
    vi.mocked(reader.listIssues).mockRejectedValue(new GitLabError('rate_limited', '/projects/1/issues', 429));
    advance(6 * 60_000);

    const envelope = await service.load();
    expect(envelope.totals.issues.status).toBe('stale');
    expect(envelope.totals.commits).toMatchObject({ status: 'current', asOf: '2026-09-30T12:06:00.000Z' });
  });

  it('retries a degraded refresh after 30 seconds instead of five minutes', async () => {
    const { service, reader, advance } = setup();
    vi.mocked(reader.listCommits).mockRejectedValueOnce(new GitLabError('timeout', '/x'));
    await service.load();
    advance(31_000);
    await service.load();
    expect(reader.listCommits).toHaveBeenCalledTimes(2);
  });

  it('shows "no qualifying pipeline" as unavailable rather than an older snapshot', async () => {
    const { service, reader, advance } = setup();
    await service.load();
    vi.mocked(reader.listPipelineJobs).mockResolvedValue([{ id: 90, name: 'unit', status: 'failed' }]);
    advance(6 * 60_000);

    const envelope = await service.load();
    expect(envelope.pipeline).toBeNull();
    expect(envelope.totals.unitTests).toMatchObject({ status: 'unavailable', value: null, skipped: null });
    expect(envelope.totals.unitTests.message).toMatch(/successful unit job/);
  });

  it('logs failed sources without secrets', async () => {
    const reader = healthyReader();
    failEverything(reader);
    await setup(reader).service.load();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('glpat-secret');
    expect(console.warn).toHaveBeenCalledWith('statistics source failed', expect.objectContaining({ source: 'project' }));
  });
});

describe('coalescing cache', () => {
  it('shares one in-flight refresh between concurrent callers', async () => {
    let release!: () => void;
    const refresh = vi.fn(
      () => new Promise<{ value: number; ttlMs: number }>((resolve) => (release = () => resolve({ value: 7, ttlMs: 1000 }))),
    );
    const load = createCoalescingCache(refresh, () => 0);

    const first = load();
    const second = load();
    release();
    expect(await Promise.all([first, second])).toEqual([7, 7]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not cache a refresh that throws', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ value: 1, ttlMs: 1000 });
    const load = createCoalescingCache(refresh, () => 0);

    await expect(load()).rejects.toThrow('boom');
    expect(await load()).toBe(1);
  });
});
