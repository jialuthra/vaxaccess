// Read-only GitLab REST client for the statistics Lambda (DESIGN.md §4.9).
//
// Every request is a GET to the configured GitLab API origin with a bounded timeout.
// Paginated endpoints are followed through GitLab's `Link: rel="next"` header until it
// disappears; total-count headers are never trusted because GitLab omits them on large
// collections. A failed page fails the whole read, so a partial list can never be
// mistaken for a complete total.

const DEFAULT_BASE_URL = 'https://gitlab.com/api/v4';
const PER_PAGE = '100';

export type GitLabErrorKind = 'http' | 'rate_limited' | 'timeout' | 'network' | 'pagination' | 'invalid_response';

/** Safe to log: carries only the endpoint path and status, never the token, query or response body. */
export class GitLabError extends Error {
  override readonly name = 'GitLabError';
  readonly kind: GitLabErrorKind;
  readonly endpoint: string;
  readonly status: number | undefined;

  constructor(kind: GitLabErrorKind, endpoint: string, status?: number) {
    super(`GitLab ${kind}${status === undefined ? '' : ` ${status}`} for ${endpoint}`);
    this.kind = kind;
    this.endpoint = endpoint;
    this.status = status;
  }
}

export interface GitLabProject {
  id: number;
  defaultBranch: string;
  pathWithNamespace: string;
  webUrl: string;
}

export interface GitLabCommit {
  id: string;
  author_name: string;
  author_email: string;
  parent_ids: string[];
}

export interface GitLabIssue {
  id: number;
  iid: number;
  state: string;
  author: { id: number; username: string } | null;
}

export interface GitLabPipeline {
  id: number;
  sha: string;
  ref: string;
  status: string;
  web_url: string;
}

export interface GitLabJob {
  id: number;
  name: string;
  status: string;
}

export interface GitLabTestCase {
  status: string;
  name: string;
  classname: string;
  file?: string | null;
}

export interface GitLabTestSuite {
  name: string;
  total_count: number;
  skipped_count: number;
  test_cases: GitLabTestCase[];
}

export interface GitLabTestReport {
  total_count: number;
  skipped_count: number;
  test_suites: GitLabTestSuite[];
}

export interface GitLabClientOptions {
  token: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Per-request limit, covering both the response headers and the body. */
  requestTimeoutMs?: number;
  /** Overall deadline from the handler; aborting it fails every in-flight and future request. */
  signal?: AbortSignal;
  maxRateLimitRetries?: number;
  /** A 429 asking us to wait longer than this fails immediately instead of sleeping. */
  maxRateLimitWaitMs?: number;
  /** Safety cap so a looping `next` link cannot run forever; hitting it is an error, not a truncation. */
  maxPages?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}

type Params = Record<string, string>;

export class GitLabClient {
  // Private fields keep the token out of console.log/JSON.stringify of the client.
  readonly #token: string;
  readonly #base: URL;
  readonly #fetch: typeof fetch;
  readonly #requestTimeoutMs: number;
  readonly #signal: AbortSignal | undefined;
  readonly #maxRateLimitRetries: number;
  readonly #maxRateLimitWaitMs: number;
  readonly #maxPages: number;
  readonly #sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly #now: () => number;

  constructor(options: GitLabClientOptions) {
    this.#token = options.token;
    this.#base = new URL((options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''));
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 8_000;
    this.#signal = options.signal;
    this.#maxRateLimitRetries = options.maxRateLimitRetries ?? 2;
    this.#maxRateLimitWaitMs = options.maxRateLimitWaitMs ?? 5_000;
    this.#maxPages = options.maxPages ?? 500;
    this.#sleep = options.sleep ?? defaultSleep;
    this.#now = options.now ?? Date.now;
  }

  /** Resolves the project by its namespace path; the numeric ID and default branch come from GitLab. */
  async getProject(projectPath: string): Promise<GitLabProject> {
    const url = this.#url(`/projects/${encodeURIComponent(projectPath)}`);
    const body = await this.#getJson(url);
    if (!isRecord(body) || typeof body.id !== 'number' || typeof body.default_branch !== 'string') {
      throw new GitLabError('invalid_response', this.#endpoint(url));
    }
    return {
      id: body.id,
      defaultBranch: body.default_branch,
      pathWithNamespace: String(body.path_with_namespace),
      webUrl: String(body.web_url),
    };
  }

  /**
   * Maps each roster username to its GitLab user ID, or null when GitLab has no exact match.
   * Only exact (case-insensitive) username matches count; display names are never compared.
   */
  async resolveUserIds(usernames: readonly string[]): Promise<Record<string, number | null>> {
    const ids: Record<string, number | null> = {};
    for (const username of usernames) {
      const url = this.#url('/users', { username });
      const body = await this.#getJson(url);
      if (!Array.isArray(body)) throw new GitLabError('invalid_response', this.#endpoint(url));
      const match = body.find(
        (user: unknown) =>
          isRecord(user) &&
          typeof user.id === 'number' &&
          typeof user.username === 'string' &&
          user.username.toLowerCase() === username.toLowerCase(),
      ) as { id: number } | undefined;
      ids[username] = match?.id ?? null;
    }
    return ids;
  }

  /** Every commit reachable from `ref` (merges included). Deliberately not all-branches mode. */
  listCommits(projectId: number, ref: string): Promise<GitLabCommit[]> {
    return this.#getAll<GitLabCommit>(`/projects/${projectId}/repository/commits`, { ref_name: ref });
  }

  /** Every open and closed issue in the project, regardless of who created or is assigned it. */
  listIssues(projectId: number): Promise<GitLabIssue[]> {
    return this.#getAll<GitLabIssue>(`/projects/${projectId}/issues`, { scope: 'all', state: 'all' });
  }

  /**
   * The most recent pipelines on `ref`, newest first. DESIGN.md caps snapshot selection at the
   * 20 most recent, so this reads a single page on purpose instead of paginating.
   */
  async listRecentPipelines(projectId: number, ref: string, limit = 20): Promise<GitLabPipeline[]> {
    const url = this.#url(`/projects/${projectId}/pipelines`, {
      ref,
      order_by: 'id',
      sort: 'desc',
      per_page: String(limit),
    });
    const body = await this.#getJson(url);
    if (!Array.isArray(body)) throw new GitLabError('invalid_response', this.#endpoint(url));
    return body as GitLabPipeline[];
  }

  /** All jobs in a pipeline (latest attempt of each; GitLab excludes retried jobs by default). */
  listPipelineJobs(projectId: number, pipelineId: number): Promise<GitLabJob[]> {
    return this.#getAll<GitLabJob>(`/projects/${projectId}/pipelines/${pipelineId}/jobs`);
  }

  async getTestReport(projectId: number, pipelineId: number): Promise<GitLabTestReport> {
    const url = this.#url(`/projects/${projectId}/pipelines/${pipelineId}/test_report`);
    const body = await this.#getJson(url);
    if (!isRecord(body) || !Array.isArray(body.test_suites)) {
      throw new GitLabError('invalid_response', this.#endpoint(url));
    }
    return body as unknown as GitLabTestReport;
  }

  /** Downloads one JSON file from a job's artifacts, e.g. the unit job's ownership artifact. */
  async getJobArtifactJson(projectId: number, jobId: number, artifactPath: string): Promise<unknown> {
    const encodedPath = artifactPath.split('/').map(encodeURIComponent).join('/');
    const url = this.#url(`/projects/${projectId}/jobs/${jobId}/artifacts/${encodedPath}`);
    return (await this.#request(url, true)).body;
  }

  async #getJson(url: URL): Promise<unknown> {
    return (await this.#request(url)).body;
  }

  async #getAll<T>(path: string, params: Params = {}): Promise<T[]> {
    const items: T[] = [];
    let url: URL | null = this.#url(path, { ...params, per_page: PER_PAGE });
    for (let page = 1; url; page += 1) {
      if (page > this.#maxPages) throw new GitLabError('pagination', this.#endpoint(url));
      const { body, headers }: { body: unknown; headers: Headers } = await this.#request(url);
      if (!Array.isArray(body)) throw new GitLabError('invalid_response', this.#endpoint(url));
      items.push(...(body as T[]));
      url = this.#nextPageUrl(headers, url);
    }
    return items;
  }

  /** Retries 429s after the wait GitLab asks for, within the configured limits. */
  async #request(url: URL, followStorageRedirect = false): Promise<{ body: unknown; headers: Headers }> {
    const endpoint = this.#endpoint(url);
    for (let attempt = 0; ; attempt += 1) {
      const result = await this.#attempt(url, endpoint, followStorageRedirect);
      if (result.status === 429) {
        const waitMs = retryDelayMs(result.headers, this.#now());
        if (attempt >= this.#maxRateLimitRetries || waitMs > this.#maxRateLimitWaitMs) {
          throw new GitLabError('rate_limited', endpoint, 429);
        }
        try {
          await this.#sleep(waitMs, this.#signal);
        } catch {
          throw new GitLabError('timeout', endpoint);
        }
        continue;
      }
      if (result.status < 200 || result.status >= 300) throw new GitLabError('http', endpoint, result.status);
      return { body: result.body, headers: result.headers };
    }
  }

  async #attempt(
    url: URL,
    endpoint: string,
    followStorageRedirect: boolean,
  ): Promise<{ status: number; headers: Headers; body?: unknown }> {
    const timeout = AbortSignal.timeout(this.#requestTimeoutMs);
    const signal = this.#signal ? AbortSignal.any([this.#signal, timeout]) : timeout;
    try {
      let response = await this.#fetch(url, {
        method: 'GET',
        headers: { 'PRIVATE-TOKEN': this.#token, Accept: 'application/json' },
        // Never let fetch follow redirects: it would forward the token header to another host.
        redirect: followStorageRedirect ? 'manual' : 'error',
        signal,
      });
      if (followStorageRedirect && response.status >= 300 && response.status < 400) {
        // Artifact downloads may redirect once to pre-signed object storage, fetched without the token.
        const target = redirectTarget(response.headers.get('location'), url);
        await response.body?.cancel().catch(() => undefined);
        if (!target) throw new GitLabError('invalid_response', endpoint, response.status);
        response = await this.#fetch(target, { method: 'GET', redirect: 'error', signal });
      }
      if (!response.ok) {
        // The error body is discarded unread; upstream error text is never surfaced.
        await response.body?.cancel().catch(() => undefined);
        return { status: response.status, headers: response.headers };
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch (err) {
        if (signal.aborted) throw err;
        throw new GitLabError('invalid_response', endpoint, response.status);
      }
      return { status: response.status, headers: response.headers, body };
    } catch (err) {
      if (err instanceof GitLabError) throw err;
      throw new GitLabError(signal.aborted ? 'timeout' : 'network', endpoint);
    }
  }

  #nextPageUrl(headers: Headers, current: URL): URL | null {
    const link = parseNextLink(headers.get('link'));
    if (link) {
      let next: URL;
      try {
        next = new URL(link);
      } catch {
        throw new GitLabError('pagination', this.#endpoint(current));
      }
      // The token is attached to every request, so only follow links back to the same API.
      if (next.origin !== this.#base.origin || next.pathname !== current.pathname) {
        throw new GitLabError('pagination', this.#endpoint(current));
      }
      return next;
    }
    // Offset pagination also exposes the next page number directly.
    const nextPage = headers.get('x-next-page');
    if (nextPage && /^\d+$/.test(nextPage)) {
      const next = new URL(current);
      next.searchParams.set('page', nextPage);
      return next;
    }
    return null;
  }

  #url(path: string, params: Params = {}): URL {
    const url = new URL(this.#base.href + path);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url;
  }

  /** Path relative to the API root, without the query string, for error messages and logs. */
  #endpoint(url: URL): string {
    return url.pathname.startsWith(this.#base.pathname)
      ? url.pathname.slice(this.#base.pathname.length) || '/'
      : url.pathname;
  }
}

function redirectTarget(location: string | null, base: URL): URL | null {
  if (!location) return null;
  try {
    const target = new URL(location, base);
    return target.protocol === 'https:' ? target : null;
  } catch {
    return null;
  }
}

function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const match of header.matchAll(/<([^>]*)>\s*;\s*rel="([^"]*)"/g)) {
    if (match[2]?.split(/\s+/).includes('next')) return match[1] ?? null;
  }
  return null;
}

/** Retry-After (seconds or HTTP date), then RateLimit-Reset (epoch seconds), else one second. */
export function retryDelayMs(headers: Headers, now: number): number {
  const retryAfter = headers.get('retry-after')?.trim();
  if (retryAfter) {
    if (/^\d+$/.test(retryAfter)) return Number(retryAfter) * 1000;
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, date - now);
  }
  const reset = headers.get('ratelimit-reset')?.trim();
  if (reset && /^\d+$/.test(reset)) return Math.max(0, Number(reset) * 1000 - now);
  return 1000;
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
