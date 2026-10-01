// Statistics refresh for the Lambda (DESIGN.md §4.9): resolves the project, reads the three metric
// sources in parallel, keeps each source's last good value for stale fallback, and caches the
// resulting envelope in memory for five minutes.

import type { StatsEnvelope, StatsPipeline } from '../../src/types/stats.ts';
import {
  MESSAGES,
  attributeCommits,
  attributeIssues,
  buildEnvelope,
  collectUnitTests,
  type Attribution,
  type CollectedStats,
  type GitLabReader,
  type SourceState,
  type UnitCount,
} from './aggregate.ts';
import { LastGood, createCoalescingCache } from './cache.ts';
import type { ServerConfig } from './config.ts';
import { parseContributorMap } from './contributors.ts';
import { GitLabClient, type GitLabProject } from './gitlabClient.ts';
import { describeError } from './logging.ts';
import { ROSTER, type RosterMember } from './roster.ts';

export const CACHE_TTL_MS = 5 * 60_000;
/** A refresh with any failed source is reused only briefly, so recovery shows up quickly. */
export const DEGRADED_TTL_MS = 30_000;
/** Overall budget for one refresh; keep below the Lambda timeout (about 15 s, docs/deployment.md). */
export const REFRESH_DEADLINE_MS = 12_000;

export interface StatsServiceOptions {
  config: ServerConfig;
  roster?: readonly RosterMember[];
  /** Builds a GitLab reader bound to one refresh's deadline signal. */
  createGitLab?: (signal: AbortSignal) => GitLabReader;
  now?: () => number;
  ttlMs?: number;
  degradedTtlMs?: number;
  deadlineMs?: number;
}

export interface StatsService {
  load(): Promise<StatsEnvelope>;
}

export function createStatsService(options: StatsServiceOptions): StatsService {
  const {
    config,
    roster = ROSTER,
    createGitLab = (signal) => new GitLabClient({ token: config.gitlabToken, signal }),
    now = Date.now,
    ttlMs = CACHE_TTL_MS,
    degradedTtlMs = DEGRADED_TTL_MS,
    deadlineMs = REFRESH_DEADLINE_MS,
  } = options;

  // Parsed once per execution environment; configuration cannot change without a new instance.
  const contributors = parseContributorMap(config.contributorMap, roster);
  const usernames = roster.map((member) => member.username);

  const project = new LastGood<GitLabProject>();
  const commits = new LastGood<Attribution<number>>();
  const issues = new LastGood<Attribution<number>>();
  const unitTests = new LastGood<UnitTestValue>();

  async function refresh(): Promise<{ value: StatsEnvelope; ttlMs: number }> {
    const asOf = new Date(now()).toISOString();
    const gitlab = createGitLab(AbortSignal.timeout(deadlineMs));

    let currentProject = project.get()?.value ?? null;
    try {
      currentProject = project.remember(await gitlab.getProject(config.gitlabProjectPath), asOf).value;
    } catch (err) {
      logFailure('project', err);
    }

    let states: Pick<CollectedStats, 'commits' | 'issues' | 'unitTests'>;
    if (currentProject) {
      const { id, defaultBranch } = currentProject;
      const [commitResult, issueResult, unitResult] = await Promise.allSettled([
        gitlab.listCommits(id, defaultBranch).then((list) => attributeCommits(list, contributors, roster)),
        Promise.all([gitlab.listIssues(id), gitlab.resolveUserIds(usernames)]).then(([list, ids]) =>
          attributeIssues(list, ids, contributors, roster),
        ),
        collectUnitTests(gitlab, id, defaultBranch, roster),
      ]);

      let unitState: SourceState<UnitTestValue>;
      if (unitResult.status === 'rejected') {
        unitState = settle('unitTests', unitTests, unitResult, asOf);
      } else if (unitResult.value.kind === 'none') {
        // A successful read that found no qualifying pipeline or report is a real answer, not an
        // outage: show it as unavailable with its reason instead of an older snapshot.
        unitTests.clear();
        unitState = { status: 'unavailable', message: unitResult.value.message };
      } else {
        const { pipeline, counts } = unitResult.value;
        unitState = settle('unitTests', unitTests, { status: 'fulfilled', value: { pipeline, counts } }, asOf);
      }

      states = {
        commits: settle('commits', commits, commitResult, asOf),
        issues: settle('issues', issues, issueResult, asOf),
        unitTests: unitState,
      };
    } else {
      // Without the project nothing else can be read; every source falls back on its own.
      const failed = { status: 'rejected', reason: undefined } as const;
      states = {
        commits: settle('commits', commits, failed, asOf, false),
        issues: settle('issues', issues, failed, asOf, false),
        unitTests: settle('unitTests', unitTests, failed, asOf, false),
      };
    }

    const value = buildEnvelope(
      {
        projectPath: config.gitlabProjectPath,
        generatedAt: asOf,
        defaultBranch: currentProject?.defaultBranch ?? null,
        ...states,
      },
      roster,
    );
    const allCurrent = Object.values(states).every((state) => state.status === 'current');
    return { value, ttlMs: allCurrent ? ttlMs : degradedTtlMs };
  }

  return { load: createCoalescingCache(refresh, now) };
}

type UnitTestValue = { pipeline: StatsPipeline; counts: Attribution<UnitCount> };

/** Current value on success; otherwise the last good value marked stale, or unavailable after a cold start. */
function settle<T>(
  source: string,
  store: LastGood<T>,
  result: PromiseSettledResult<T>,
  asOf: string,
  log = true,
): SourceState<T> {
  if (result.status === 'fulfilled') {
    store.remember(result.value, asOf);
    return { status: 'current', asOf, value: result.value };
  }
  if (log) logFailure(source, result.reason);
  const prior = store.get();
  return prior ? { status: 'stale', asOf: prior.asOf, value: prior.value } : { status: 'unavailable', message: MESSAGES.unavailable };
}

function logFailure(source: string, err: unknown): void {
  console.warn('statistics source failed', { source, ...describeError(err) });
}
