import { inspect } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { GitLabClient, GitLabError, retryDelayMs } from '../../../server/stats/gitlabClient.ts';

const TOKEN = 'glpat-test-secret';
const API = 'https://gitlab.com/api/v4';

type Route = (url: URL, init: RequestInit) => Response | Promise<Response>;

function json(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/** Records every request and answers from the given routes in order of calls. */
function fakeFetch(...responses: Route[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const route = responses[calls.length - 1];
    if (!route) throw new Error(`unexpected request ${url.href}`);
    return route(url, init);
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

function client(fetchImpl: typeof fetch, extra: Partial<ConstructorParameters<typeof GitLabClient>[0]> = {}) {
  return new GitLabClient({ token: TOKEN, fetch: fetchImpl, sleep: vi.fn(async () => {}), ...extra });
}

describe('GitLabClient requests', () => {
  it('resolves the project path to its ID and default branch with an authenticated GET', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json({ id: 42, default_branch: 'main', path_with_namespace: 'nifemisoyemi/cs373-fall-2026-18', web_url: 'x' }),
    );
    const project = await client(fetch).getProject('nifemisoyemi/cs373-fall-2026-18');

    expect(project).toMatchObject({ id: 42, defaultBranch: 'main' });
    expect(calls[0]?.url.href).toBe(`${API}/projects/nifemisoyemi%2Fcs373-fall-2026-18`);
    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.init.redirect).toBe('error');
    expect((calls[0]?.init.headers as Record<string, string>)['PRIVATE-TOKEN']).toBe(TOKEN);
  });

  it('rejects a project response without an ID or default branch', async () => {
    const { fetch } = fakeFetch(() => json({ id: 42 }));
    await expect(client(fetch).getProject('a/b')).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('resolves roster usernames by exact match and reports unknown users as null', async () => {
    const { fetch, calls } = fakeFetch(
      () => json([{ id: 7, username: 'J.EnzoSagun' }]),
      () => json([{ id: 8, username: 'someone-else' }]),
    );
    const ids = await client(fetch).resolveUserIds(['j.enzosagun', 'missing']);

    expect(ids).toEqual({ 'j.enzosagun': 7, missing: null });
    expect(calls[0]?.url.searchParams.get('username')).toBe('j.enzosagun');
  });

  it('reads commits on the given branch only, not all branches', async () => {
    const { fetch, calls } = fakeFetch(() => json([]));
    await client(fetch).listCommits(42, 'main');

    const params = calls[0]?.url.searchParams;
    expect(calls[0]?.url.pathname).toBe('/api/v4/projects/42/repository/commits');
    expect(params?.get('ref_name')).toBe('main');
    expect(params?.has('all')).toBe(false);
  });

  it('reads issues with scope=all and state=all', async () => {
    const { fetch, calls } = fakeFetch(() => json([]));
    await client(fetch).listIssues(42);

    expect(calls[0]?.url.searchParams.get('scope')).toBe('all');
    expect(calls[0]?.url.searchParams.get('state')).toBe('all');
  });

  it('reads the 20 most recent pipelines on the branch, newest first, in one request', async () => {
    const next = `<${API}/projects/42/pipelines?page=2>; rel="next"`;
    const { fetch, calls } = fakeFetch(() => json([{ id: 9 }, { id: 8 }], { Link: next }));
    const pipelines = await client(fetch).listRecentPipelines(42, 'main');

    expect(pipelines.map((p) => p.id)).toEqual([9, 8]);
    expect(calls).toHaveLength(1);
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({
      ref: 'main',
      order_by: 'id',
      sort: 'desc',
      per_page: '20',
    });
  });

  it('reads pipeline jobs and the test report', async () => {
    const { fetch, calls } = fakeFetch(
      () => json([{ id: 1, name: 'unit', status: 'success' }]),
      () => json({ total_count: 0, skipped_count: 0, test_suites: [] }),
    );
    const gitlab = client(fetch);

    expect(await gitlab.listPipelineJobs(42, 9)).toEqual([{ id: 1, name: 'unit', status: 'success' }]);
    expect(await gitlab.getTestReport(42, 9)).toEqual({ total_count: 0, skipped_count: 0, test_suites: [] });
    expect(calls.map((c) => c.url.pathname)).toEqual([
      '/api/v4/projects/42/pipelines/9/jobs',
      '/api/v4/projects/42/pipelines/9/test_report',
    ]);
  });
});

describe('GitLabClient artifact download', () => {
  it('reads a JSON artifact file from a job', async () => {
    const { fetch, calls } = fakeFetch(() => json({ schemaVersion: 1 }));
    expect(await client(fetch).getJobArtifactJson(42, 7, 'reports/unit-test-owners.json')).toEqual({ schemaVersion: 1 });
    expect(calls[0]?.url.pathname).toBe('/api/v4/projects/42/jobs/7/artifacts/reports/unit-test-owners.json');
    expect(calls[0]?.init.redirect).toBe('manual');
  });

  it('follows one redirect to object storage without sending the token there', async () => {
    const { fetch, calls } = fakeFetch(
      () => new Response(null, { status: 302, headers: { Location: 'https://storage.example/signed?sig=1' } }),
      () => json({ owners: {} }),
    );
    expect(await client(fetch).getJobArtifactJson(42, 7, 'reports/unit-test-owners.json')).toEqual({ owners: {} });
    expect(calls[1]?.url.host).toBe('storage.example');
    expect(JSON.stringify(calls[1]?.init.headers ?? {})).not.toContain(TOKEN);
    expect(calls[1]?.init.redirect).toBe('error');
  });

  it('refuses a non-HTTPS redirect', async () => {
    const { fetch, calls } = fakeFetch(
      () => new Response(null, { status: 302, headers: { Location: 'http://storage.example/plain' } }),
    );
    await expect(client(fetch).getJobArtifactJson(42, 7, 'a.json')).rejects.toMatchObject({ kind: 'invalid_response' });
    expect(calls).toHaveLength(1);
  });

  it('reports a missing artifact as a 404', async () => {
    const { fetch } = fakeFetch(() => json({ message: '404 Not Found' }, {}, 404));
    await expect(client(fetch).getJobArtifactJson(42, 7, 'a.json')).rejects.toMatchObject({ kind: 'http', status: 404 });
  });
});

describe('GitLabClient pagination', () => {
  it('follows Link rel="next" until it disappears, without relying on total headers', async () => {
    const page = (n: number) => `${API}/projects/42/issues?page=${n}&per_page=100&scope=all&state=all`;
    const { fetch, calls } = fakeFetch(
      () => json([{ id: 1 }, { id: 2 }], { Link: `<${page(2)}>; rel="next", <${page(1)}>; rel="first"` }),
      () => json([{ id: 3 }], { Link: `<${page(3)}>; rel="next"` }),
      () => json([{ id: 4 }], { Link: `<${page(1)}>; rel="first"` }),
    );
    const issues = await client(fetch).listIssues(42);

    expect(issues.map((i) => i.id)).toEqual([1, 2, 3, 4]);
    expect(calls[0]?.url.searchParams.get('per_page')).toBe('100');
    expect(calls.map((c) => c.url.searchParams.get('page'))).toEqual([null, '2', '3']);
  });

  it('falls back to X-Next-Page when there is no Link header', async () => {
    const { fetch, calls } = fakeFetch(
      () => json([{ id: 1 }], { 'X-Next-Page': '2' }),
      () => json([{ id: 2 }], { 'X-Next-Page': '' }),
    );
    expect(await client(fetch).listPipelineJobs(42, 9)).toHaveLength(2);
    expect(calls[1]?.url.searchParams.get('page')).toBe('2');
  });

  it('refuses to send the token to a next link on another host', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json([{ id: 1 }], { Link: '<https://evil.example/api/v4/projects/42/issues?page=2>; rel="next"' }),
    );
    await expect(client(fetch).listIssues(42)).rejects.toMatchObject({ kind: 'pagination' });
    expect(calls).toHaveLength(1);
  });

  it('fails the whole read when any page fails, instead of returning a partial list', async () => {
    const { fetch } = fakeFetch(
      () => json([{ id: 1 }], { 'X-Next-Page': '2' }),
      () => json({ message: 'boom' }, {}, 502),
    );
    await expect(client(fetch).listCommits(42, 'main')).rejects.toMatchObject({ kind: 'http', status: 502 });
  });

  it('treats an endless next link as an error once the page cap is reached', async () => {
    const loop = () => json([{ id: 1 }], { 'X-Next-Page': '2' });
    const { fetch } = fakeFetch(loop, loop, loop);
    await expect(client(fetch, { maxPages: 2 }).listIssues(42)).rejects.toMatchObject({ kind: 'pagination' });
  });
});

describe('GitLabClient rate limits and timeouts', () => {
  it('waits for Retry-After on 429 and then retries', async () => {
    const sleep = vi.fn(async () => {});
    const { fetch, calls } = fakeFetch(
      () => json({}, { 'Retry-After': '2' }, 429),
      () => json([{ id: 1 }]),
    );
    expect(await client(fetch, { sleep }).listIssues(42)).toHaveLength(1);
    expect(sleep).toHaveBeenCalledWith(2000, undefined);
    expect(calls).toHaveLength(2);
  });

  it('gives up after the retry limit', async () => {
    const limited = () => json({}, { 'Retry-After': '1' }, 429);
    const { fetch, calls } = fakeFetch(limited, limited, limited);
    await expect(client(fetch, { maxRateLimitRetries: 2 }).listIssues(42)).rejects.toMatchObject({
      kind: 'rate_limited',
      status: 429,
    });
    expect(calls).toHaveLength(3);
  });

  it('fails immediately when GitLab asks for a wait longer than allowed', async () => {
    const sleep = vi.fn(async () => {});
    const { fetch } = fakeFetch(() => json({}, { 'Retry-After': '60' }, 429));
    await expect(client(fetch, { sleep, maxRateLimitWaitMs: 5000 }).listIssues(42)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('computes waits from Retry-After dates and RateLimit-Reset', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(retryDelayMs(new Headers({ 'Retry-After': 'Wed, 30 Sep 2026 12:00:03 GMT' }), now)).toBe(3000);
    expect(retryDelayMs(new Headers({ 'RateLimit-Reset': String(now / 1000 + 4) }), now)).toBe(4000);
    expect(retryDelayMs(new Headers(), now)).toBe(1000);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const hang: Route = (_url, init) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
    const { fetch } = fakeFetch(hang);
    await expect(client(fetch, { requestTimeoutMs: 10 }).getProject('a/b')).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('reports network failures without upstream details', async () => {
    const { fetch } = fakeFetch(() => {
      throw new TypeError('fetch failed');
    });
    await expect(client(fetch).getProject('a/b')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('GitLabClient credential handling', () => {
  it('never exposes the token through inspection, serialization or errors', async () => {
    const { fetch } = fakeFetch(() => json({ message: `bad token ${TOKEN}` }, {}, 401));
    const gitlab = client(fetch);

    expect(inspect(gitlab, { showHidden: true, depth: 5 })).not.toContain(TOKEN);
    expect(JSON.stringify(gitlab)).not.toContain(TOKEN);

    const error = await gitlab.getProject('a/b').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(GitLabError);
    expect(inspect(error)).not.toContain(TOKEN);
    expect((error as GitLabError).message).toBe('GitLab http 401 for /projects/a%2Fb');
  });
});
