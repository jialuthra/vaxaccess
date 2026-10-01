// Statistics service response contract from DESIGN.md §4.9, shared by the Lambda and the About page.

/** current: fetched on this refresh; stale: an earlier successful value kept after an upstream failure. */
export type MetricStatus = 'current' | 'stale' | 'unavailable';

export interface MetricGroup {
  status: MetricStatus;
  /** ISO UTC time the value was fetched; a stale value keeps its original timestamp. */
  asOf: string | null;
  /** Nonnegative integer, or null when unavailable. Never a fabricated zero. */
  value: number | null;
  /** Safe, user-facing explanation for stale or unavailable values. */
  message: string | null;
}

export interface UnitTestMetricGroup extends MetricGroup {
  /** Skipped cases, reported separately from executed ones. */
  skipped: number | null;
}

export interface MetricSet {
  commits: MetricGroup;
  issues: MetricGroup;
  unitTests: UnitTestMetricGroup;
}

export interface MemberStats extends MetricSet {
  name: string;
  username: string;
}

/** The pipeline whose test report produced the displayed unit-test snapshot. */
export interface StatsPipeline {
  id: number;
  sha: string;
  url: string;
}

export interface StatsEnvelope {
  projectPath: string;
  generatedAt: string;
  defaultBranch: string | null;
  pipeline: StatsPipeline | null;
  /** Exactly the five roster members, in roster order. */
  members: MemberStats[];
  totals: MetricSet;
  /** Non-roster or unmatched contributions, so members + unattributed = totals. */
  unattributed: MetricSet;
}
