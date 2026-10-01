// End-to-end statistics refresh: the real GitLabClient, aggregation and service, with only the
// network replaced by a scripted GitLab. Each rule is also unit-tested on its own; this checks
// they hold together across pagination, retries and snapshot selection.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitLabClient } from '../../../server/stats/gitlabClient.ts';
import { createStatsService } from '../../../server/stats/service.ts';
import type { StatsEnvelope } from '../../../src/types/stats.ts';

const TOKEN = 'glpat-integration-secret';
const API = 'https://gitlab.com/api/v4';
const PROJECT_PATH = 'nifemisoyemi/cs373-fall-2026-18';

const USER_IDS: Record<string, number> = { jiakl: 101, atb2923: 102, 'j.enzosagun': 103, nifemisoyemi: 104, lukeyawn: 105 };

const CONTRIBUTOR_MAP = JSON.stringify({
  jiakl: { emails: ['jia@example.com'], names: [] },
  atb2923: { emails: ['alex@example.com'], names: [] },
  'j.enzosagun': { emails: ['enzo@example.com'], names: [] },
  nifemisoyemi: { emails: ['nifemi@example.com'], names: [] },
  lukeyawn: { emails: ['luke@example.com'], names: ['Luke Y'] },
});

const json = (body: unknown, headers: Record<string, string> = {}, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const commit = (id: string, email: string, name = 'Someone') => ({
  id,
  author_email: email,
  author_name: name,
  parent_ids: [],
});

const testCase = (classname: string, name: string, status = 'success') => ({ classname, name, status });

/** A scripted GitLab: each endpoint, with multi-page lists, one 429 and two candidate pipelines. */
function scriptedGitLab() {
  let issuesPage2Calls = 0;
  const requests: URL[] = [];

  const route = (url: URL): Response => {
    const path = url.pathname.replace('/api/v4', '');
    const page = url.searchParams.get('page');

    if (path === '/projects/nifemisoyemi%2Fcs373-fall-2026-18') {
      return json({ id: 1, default_branch: 'main', path_with_namespace: PROJECT_PATH, web_url: '' });
    }
    if (path === '/users') {
      const username = url.searchParams.get('username')!;
      return json([{ id: USER_IDS[username], username }]);
    }
    if (path === '/projects/1/repository/commits') {
      // The same SHA appears on both pages, as can happen when the branch moves mid-read.
      if (!page) {
        return json([commit('c1', 'jia@example.com'), commit('c2', 'enzo@example.com')], {
          Link: `<${API}/projects/1/repository/commits?page=2&per_page=100&ref_name=main>; rel="next"`,
        });
      }
      return json([
        commit('c2', 'enzo@example.com'),
        commit('c3', 'outsider@example.com', 'Outsider'),
        commit('c4', 'luke@laptop.local', 'Luke Y'),
      ]);
    }
    if (path === '/projects/1/issues') {
      if (!page) {
        return json(
          [
            { id: 1, iid: 1, state: 'opened', author: { id: 101, username: 'jiakl' } },
            // Created by someone outside the roster but assigned to Enzo: counts as unattributed.
            { id: 2, iid: 2, state: 'closed', author: { id: 999, username: 'ta' }, assignees: [{ id: 103 }] },
          ],
          { 'X-Next-Page': '2' },
        );
      }
      issuesPage2Calls += 1;
      if (issuesPage2Calls === 1) return json({ message: 'Retry later' }, { 'Retry-After': '1' }, 429);
      return json([{ id: 3, iid: 3, state: 'opened', author: { id: 103, username: 'j.enzosagun' } }]);
    }
    if (path === '/projects/1/pipelines') {
      return json([
        { id: 3, sha: 'sha3', ref: 'main', status: 'failed', web_url: 'https://gitlab.com/p/3' },
        { id: 2, sha: 'sha2', ref: 'main', status: 'failed', web_url: 'https://gitlab.com/p/2' },
      ]);
    }
    if (path === '/projects/1/pipelines/3/jobs') {
      return json([
        { id: 31, name: 'check', status: 'success' },
        { id: 32, name: 'unit', status: 'failed' },
      ]);
    }
    if (path === '/projects/1/pipelines/2/jobs') {
      return json([
        { id: 21, name: 'unit', status: 'success' },
        { id: 22, name: 'acceptance', status: 'failed' },
      ]);
    }
    if (path === '/projects/1/pipelines/2/test_report') {
      return json({
        total_count: 6,
        skipped_count: 1,
        test_suites: [
          {
            name: 'unit',
            total_count: 5,
            skipped_count: 1,
            test_cases: [
              testCase('tests/unit/a.test.ts > Suite', 'adds 1 + 1'),
              testCase('tests/unit/a.test.ts > Suite', 'adds 2 + 2'),
              testCase('tests/unit/a.test.ts > Suite', 'later', 'skipped'),
              testCase('tests/unit/b.test.ts > B', 'works'),
              testCase('tests/unit/new.test.ts > New', 'has no owner yet'),
            ],
          },
          { name: 'acceptance', total_count: 1, skipped_count: 0, test_cases: [testCase('e2e/home.spec.ts', 'loads')] },
        ],
      });
    }
    if (path === '/projects/1/jobs/21/artifacts/reports/unit-test-owners.json') {
      return json({
        schemaVersion: 1,
        pipelineId: 2,
        sha: 'sha2',
        owners: { 'tests/unit/a.test.ts': 'jiakl', 'tests/unit/b.test.ts': 'lukeyawn' },
      });
    }
    return json({ message: '404 Not Found' }, {}, 404);
  };

  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url);
    expect((init?.headers as Record<string, string>)['PRIVATE-TOKEN']).toBe(TOKEN);
    return route(url);
  }) as unknown as typeof globalThis.fetch;

  return { fetch, requests };
}

function load(): Promise<StatsEnvelope> {
  const gitlab = scriptedGitLab();
  const service = createStatsService({
    config: { gitlabToken: TOKEN, gitlabProjectPath: PROJECT_PATH, contributorMap: CONTRIBUTOR_MAP },
    createGitLab: (signal) => new GitLabClient({ token: TOKEN, fetch: gitlab.fetch, signal, sleep: async () => {} }),
  });
  return service.load();
}

const values = (envelope: StatsEnvelope, metric: 'commits' | 'issues') =>
  Object.fromEntries([
    ...envelope.members.map((m) => [m.username, m[metric].value]),
    ['unattributed', envelope.unattributed[metric].value],
    ['total', envelope.totals[metric].value],
  ]);

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('statistics refresh end to end', () => {
  it('counts commits across pages once each, attributing by alias and reconciling', async () => {
    expect(values(await load(), 'commits')).toEqual({
      jiakl: 1,
      atb2923: 0,
      'j.enzosagun': 1,
      nifemisoyemi: 0,
      lukeyawn: 1, // matched by exact name alias; the email is not in the map
      unattributed: 1,
      total: 4,
    });
  });

  it('counts issues by author across pages, after waiting out a 429', async () => {
    const envelope = await load();
    expect(values(envelope, 'issues')).toEqual({
      jiakl: 1,
      atb2923: 0,
      'j.enzosagun': 1,
      nifemisoyemi: 0,
      lukeyawn: 0,
      unattributed: 1,
      total: 3,
    });
    expect(envelope.totals.issues.status).toBe('current');
  });

  it('selects the pipeline whose unit job passed despite a failed acceptance job', async () => {
    const envelope = await load();
    expect(envelope.pipeline).toEqual({ id: 2, sha: 'sha2', url: 'https://gitlab.com/p/2' });
    expect(envelope.defaultBranch).toBe('main');
  });

  it('counts unit tests from that report with skipped, parameterized and unowned cases', async () => {
    const envelope = await load();
    const units = (username: string) => {
      const group = envelope.members.find((m) => m.username === username)!.unitTests;
      return [group.value, group.skipped];
    };

    expect(units('jiakl')).toEqual([2, 1]); // two parameterized cases executed, one skipped
    expect(units('lukeyawn')).toEqual([1, 0]);
    expect(units('j.enzosagun')).toEqual([0, 0]);
    expect([envelope.unattributed.unitTests.value, envelope.unattributed.unitTests.skipped]).toEqual([1, 0]);
    // Acceptance cases are excluded from the total.
    expect([envelope.totals.unitTests.value, envelope.totals.unitTests.skipped]).toEqual([4, 1]);
  });

  it('never puts the token in the response', async () => {
    expect(JSON.stringify(await load())).not.toContain(TOKEN);
  });
});
