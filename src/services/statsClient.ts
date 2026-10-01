// Client for the statistics Lambda (DESIGN.md §4.9). Never throws for service problems: every
// failure becomes a reason the About page can show. Only an abort (the page was left or a newer
// request replaced this one) is rethrown, so callers can ignore it.

import type { MetricGroup, MetricSet, StatsEnvelope } from '../types/stats.ts';

/** About requests statistics on entry and then at this interval while visible. */
export const STATS_REFRESH_MS = 5 * 60_000;

export type StatsFailure = 'not-configured' | 'throttled' | 'unavailable' | 'network' | 'invalid';

export type StatsResult = { ok: true; stats: StatsEnvelope } | { ok: false; reason: StatsFailure };

export type StatsFetcher = (url: string | null, signal?: AbortSignal) => Promise<StatsResult>;

export const fetchStats: StatsFetcher = async (url, signal) => {
  if (!url) return { ok: false, reason: 'not-configured' };

  let response: Response;
  try {
    // No credentials and no custom headers, so the browser sends a simple CORS request.
    response = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store', signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    return { ok: false, reason: 'network' };
  }

  // Throttling and server errors are temporary unavailability, never fabricated zeros.
  if (response.status === 429) return { ok: false, reason: 'throttled' };
  if (!response.ok) return { ok: false, reason: 'unavailable' };

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    return { ok: false, reason: 'invalid' };
  }
  return isStatsEnvelope(body) ? { ok: true, stats: body } : { ok: false, reason: 'invalid' };
};

/** Structural check of the response, so a malformed body can never render as numbers. */
export function isStatsEnvelope(value: unknown): value is StatsEnvelope {
  if (!isRecord(value)) return false;
  const { projectPath, generatedAt, defaultBranch, pipeline, members, totals, unattributed } = value;
  return (
    typeof projectPath === 'string' &&
    typeof generatedAt === 'string' &&
    (defaultBranch === null || typeof defaultBranch === 'string') &&
    (pipeline === null ||
      (isRecord(pipeline) &&
        typeof pipeline.id === 'number' &&
        typeof pipeline.sha === 'string' &&
        typeof pipeline.url === 'string')) &&
    Array.isArray(members) &&
    members.every(
      (member) =>
        isRecord(member) && typeof member.name === 'string' && typeof member.username === 'string' && isMetricSet(member),
    ) &&
    isMetricSet(totals) &&
    isMetricSet(unattributed)
  );
}

function isMetricSet(value: unknown): value is MetricSet {
  return (
    isRecord(value) &&
    isMetricGroup(value.commits) &&
    isMetricGroup(value.issues) &&
    isMetricGroup(value.unitTests) &&
    isCount(value.unitTests.skipped)
  );
}

function isMetricGroup(value: unknown): value is MetricGroup & Record<string, unknown> {
  return (
    isRecord(value) &&
    (value.status === 'current' || value.status === 'stale' || value.status === 'unavailable') &&
    (value.asOf === null || typeof value.asOf === 'string') &&
    (value.message === null || typeof value.message === 'string') &&
    isCount(value.value)
  );
}

function isCount(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
