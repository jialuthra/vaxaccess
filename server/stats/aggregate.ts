// Metric attribution, unit-test snapshot selection and the response envelope (DESIGN.md §4.9).
//
// Every metric reconciles: total = sum of members + unattributed. When members cannot be attributed
// (missing contributor map, unresolved account, missing ownership artifact), members and
// unattributed both become unavailable together while the project total stays available, so a
// partial split is never presented as complete.

import type {
  MemberStats,
  MetricGroup,
  MetricSet,
  StatsEnvelope,
  StatsPipeline,
  UnitTestMetricGroup,
} from '../../src/types/stats.ts';
import { normalizeEmail, normalizeName, type ContributorMapResult } from './contributors.ts';
import {
  GitLabError,
  type GitLabClient,
  type GitLabCommit,
  type GitLabIssue,
  type GitLabTestCase,
  type GitLabTestReport,
} from './gitlabClient.ts';
import type { RosterMember } from './roster.ts';

export const UNIT_JOB_NAME = 'unit';
export const OWNERSHIP_ARTIFACT_PATH = 'reports/unit-test-owners.json';
export const MAX_PIPELINES_CHECKED = 20;

export const MESSAGES = {
  unavailable: 'GitLab statistics are unavailable right now.',
  stale: 'GitLab is unavailable; showing the last successful value.',
  noPipeline: `None of the ${MAX_PIPELINES_CHECKED} most recent default-branch pipelines has a successful unit job.`,
  noReport: 'The selected pipeline has no unit-test report.',
  noOwnership: 'The selected pipeline has no unit-test ownership artifact.',
  badOwnership: 'The unit-test ownership artifact is malformed.',
  ownershipVersion: 'The unit-test ownership artifact has an unsupported schema version.',
  ownershipMismatch: 'The unit-test ownership artifact does not belong to the selected pipeline.',
  unresolvedAccount: "Could not resolve every roster member's GitLab account.",
  idMismatch: "A roster member's GitLab user ID does not match CONTRIBUTOR_MAP.",
} as const;

/** A project-wide count and its split. `members` and `unattributed` are null together. */
export interface Attribution<T> {
  total: T;
  members: Record<string, T> | null;
  unattributed: T | null;
  /** Why the split is unavailable, when it is. */
  attributionMessage: string | null;
}

export interface UnitCount {
  executed: number;
  skipped: number;
}

export type GitLabReader = Pick<
  GitLabClient,
  | 'getProject'
  | 'resolveUserIds'
  | 'listCommits'
  | 'listIssues'
  | 'listRecentPipelines'
  | 'listPipelineJobs'
  | 'getTestReport'
  | 'getJobArtifactJson'
>;

/** Commits by recorded author, matched through CONTRIBUTOR_MAP email and exact-name aliases. */
export function attributeCommits(
  commits: readonly GitLabCommit[],
  contributors: ContributorMapResult,
  roster: readonly RosterMember[],
): Attribution<number> {
  // Each SHA counts once even if the API repeats it.
  const unique = new Map(commits.map((commit) => [commit.id, commit]));
  if (!contributors.ok) return withoutSplit(unique.size, contributors.message);

  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const [username, aliases] of Object.entries(contributors.map)) {
    for (const email of aliases.emails) byEmail.set(email, username);
    for (const name of aliases.names) byName.set(name, username);
  }

  const members = zeroes(roster);
  let unattributed = 0;
  for (const commit of unique.values()) {
    // Email is the stronger identity; a name alias is used only when no email alias matches.
    const username =
      byEmail.get(normalizeEmail(commit.author_email ?? '')) ?? byName.get(normalizeName(commit.author_name ?? ''));
    if (username === undefined) unattributed += 1;
    else members[username] = (members[username] ?? 0) + 1;
  }
  return { total: unique.size, members, unattributed, attributionMessage: null };
}

/** Issues by author ID (never assignee). IDs come from GitLab, cross-checked against the map when set. */
export function attributeIssues(
  issues: readonly GitLabIssue[],
  resolvedIds: Record<string, number | null>,
  contributors: ContributorMapResult,
  roster: readonly RosterMember[],
): Attribution<number> {
  const unique = new Map(issues.map((issue) => [issue.id, issue]));

  const usernameById = new Map<number, string>();
  for (const { username } of roster) {
    const resolved = resolvedIds[username] ?? null;
    const configured = contributors.ok ? (contributors.map[username]?.userId ?? null) : null;
    if (resolved !== null && configured !== null && resolved !== configured) {
      return withoutSplit(unique.size, MESSAGES.idMismatch);
    }
    const id = resolved ?? configured;
    if (id === null) return withoutSplit(unique.size, MESSAGES.unresolvedAccount);
    usernameById.set(id, username);
  }

  const members = zeroes(roster);
  let unattributed = 0;
  for (const issue of unique.values()) {
    const username = issue.author ? usernameById.get(issue.author.id) : undefined;
    if (username === undefined) unattributed += 1;
    else members[username] = (members[username] ?? 0) + 1;
  }
  return { total: unique.size, members, unattributed, attributionMessage: null };
}

export type OwnershipResult = { ok: true; owners: Record<string, string> } | { ok: false; message: string };

/** Checks the `unit-test-owners.json` artifact belongs to the exact pipeline and commit being counted. */
export function validateOwnership(raw: unknown, pipeline: { id: number; sha: string }): OwnershipResult {
  if (!isRecord(raw)) return { ok: false, message: MESSAGES.badOwnership };
  if (raw.schemaVersion !== 1) return { ok: false, message: MESSAGES.ownershipVersion };
  if (raw.pipelineId !== pipeline.id || raw.sha !== pipeline.sha) {
    return { ok: false, message: MESSAGES.ownershipMismatch };
  }
  const { owners } = raw;
  if (!isRecord(owners) || !Object.values(owners).every((owner) => typeof owner === 'string')) {
    return { ok: false, message: MESSAGES.badOwnership };
  }
  return { ok: true, owners: owners as Record<string, string> };
}

/**
 * Distinct unit-test cases from the `unit` job's suite of the pipeline test report. Returns null when
 * that suite is absent; a present suite with zero cases is a real zero.
 */
export function countUnitTests(
  report: GitLabTestReport,
  ownership: OwnershipResult,
  roster: readonly RosterMember[],
): Attribution<UnitCount> | null {
  // GitLab names report suites after their job. Only the unit job's JUnit counts; Playwright never does.
  const suites = report.test_suites.filter((suite) => suite.name === UNIT_JOB_NAME);
  if (suites.length === 0 || suites.some((suite) => !Array.isArray(suite.test_cases))) return null;

  // classname carries the file path and suite name, so classname + name identifies one case.
  // Parameterized cases have distinct names and therefore count separately.
  const cases = new Map<string, GitLabTestCase>();
  for (const suite of suites) {
    for (const testCase of suite.test_cases) cases.set(`${testCase.classname}\u0000${testCase.name}`, testCase);
  }

  const total = emptyUnitCount();
  for (const testCase of cases.values()) tally(total, testCase);
  if (!ownership.ok) return withoutSplit(total, ownership.message);

  const rosterUsernames = new Set(roster.map((member) => member.username));
  // Longest path first, so `a.test.tsx` is never claimed by an owner of `a.test.ts`.
  const ownedFiles = Object.keys(ownership.owners).sort((a, b) => b.length - a.length);
  const members: Record<string, UnitCount> = Object.fromEntries(roster.map((m) => [m.username, emptyUnitCount()]));
  const unattributed = emptyUnitCount();

  for (const testCase of cases.values()) {
    const file = ownedFileOf(testCase, ownedFiles);
    const owner = file === undefined ? undefined : ownership.owners[file];
    // A file missing from `owners` (or owned by a non-roster name) still counts toward the total.
    tally(owner !== undefined && rosterUsernames.has(owner) ? members[owner]! : unattributed, testCase);
  }
  return { total, members, unattributed, attributionMessage: null };
}

function ownedFileOf(testCase: GitLabTestCase, ownedFiles: readonly string[]): string | undefined {
  if (testCase.file && ownedFiles.includes(testCase.file)) return testCase.file;
  return ownedFiles.find(
    (file) =>
      testCase.classname === file ||
      (testCase.classname.startsWith(file) && /[\s>:|#]/.test(testCase.classname.charAt(file.length))),
  );
}

/**
 * The newest of the most recent default-branch pipelines whose `unit` job succeeded. Other jobs
 * (e.g. a failed acceptance job) do not disqualify a pipeline.
 */
export async function selectUnitTestPipeline(gitlab: GitLabReader, projectId: number, ref: string) {
  const pipelines = await gitlab.listRecentPipelines(projectId, ref, MAX_PIPELINES_CHECKED);
  for (const pipeline of pipelines.slice(0, MAX_PIPELINES_CHECKED)) {
    const jobs = await gitlab.listPipelineJobs(projectId, pipeline.id);
    const unitJob = jobs.find((job) => job.name === UNIT_JOB_NAME);
    if (unitJob?.status === 'success') return { pipeline, unitJob };
  }
  return null;
}

export type UnitTestSnapshot =
  | { kind: 'ok'; pipeline: StatsPipeline; counts: Attribution<UnitCount> }
  | { kind: 'none'; message: string };

export async function collectUnitTests(
  gitlab: GitLabReader,
  projectId: number,
  ref: string,
  roster: readonly RosterMember[],
): Promise<UnitTestSnapshot> {
  const selected = await selectUnitTestPipeline(gitlab, projectId, ref);
  if (!selected) return { kind: 'none', message: MESSAGES.noPipeline };
  const { pipeline, unitJob } = selected;

  const report = await gitlab.getTestReport(projectId, pipeline.id);

  let ownership: OwnershipResult;
  try {
    ownership = validateOwnership(
      await gitlab.getJobArtifactJson(projectId, unitJob.id, OWNERSHIP_ARTIFACT_PATH),
      pipeline,
    );
  } catch (err) {
    // A missing artifact is a known state; any other failure fails the refresh so a stale value can show.
    if (!(err instanceof GitLabError) || err.status !== 404) throw err;
    ownership = { ok: false, message: MESSAGES.noOwnership };
  }

  const counts = countUnitTests(report, ownership, roster);
  if (!counts) return { kind: 'none', message: MESSAGES.noReport };
  return { kind: 'ok', pipeline: { id: pipeline.id, sha: pipeline.sha, url: pipeline.web_url }, counts };
}

/** One metric source after a refresh: fetched now, kept from an earlier refresh, or unavailable. */
export type SourceState<T> =
  | { status: 'current' | 'stale'; asOf: string; value: T }
  | { status: 'unavailable'; message: string };

export interface CollectedStats {
  projectPath: string;
  generatedAt: string;
  defaultBranch: string | null;
  commits: SourceState<Attribution<number>>;
  issues: SourceState<Attribution<number>>;
  unitTests: SourceState<{ pipeline: StatsPipeline; counts: Attribution<UnitCount> }>;
}

export function buildEnvelope(stats: CollectedStats, roster: readonly RosterMember[]): StatsEnvelope {
  const units: SourceState<Attribution<UnitCount>> =
    stats.unitTests.status === 'unavailable' ? stats.unitTests : { ...stats.unitTests, value: stats.unitTests.value.counts };

  const metricSet = (
    pickCount: <T>(attribution: Attribution<T>) => T | null | undefined,
  ): MetricSet => ({
    commits: metric(stats.commits, pickCount),
    issues: metric(stats.issues, pickCount),
    unitTests: unitMetric(units, pickCount),
  });

  const members: MemberStats[] = roster.map(({ name, username }) => ({
    name,
    username,
    ...metricSet((a) => a.members?.[username]),
  }));

  return {
    projectPath: stats.projectPath,
    generatedAt: stats.generatedAt,
    defaultBranch: stats.defaultBranch,
    // Always the pipeline behind the displayed unit-test numbers, including when they are stale.
    pipeline: stats.unitTests.status === 'unavailable' ? null : stats.unitTests.value.pipeline,
    members,
    totals: metricSet((a) => a.total),
    unattributed: metricSet((a) => a.unattributed),
  };
}

function metric(
  state: SourceState<Attribution<number>>,
  pick: (attribution: Attribution<number>) => number | null | undefined,
): MetricGroup {
  const resolved = resolve(state, pick);
  return { ...resolved, value: resolved.value ?? null };
}

function unitMetric(
  state: SourceState<Attribution<UnitCount>>,
  pick: (attribution: Attribution<UnitCount>) => UnitCount | null | undefined,
): UnitTestMetricGroup {
  const resolved = resolve(state, pick);
  return { ...resolved, value: resolved.value?.executed ?? null, skipped: resolved.value?.skipped ?? null };
}

function resolve<T>(
  state: SourceState<Attribution<T>>,
  pick: (attribution: Attribution<T>) => T | null | undefined,
): Omit<MetricGroup, 'value'> & { value: T | null } {
  if (state.status === 'unavailable') return { status: 'unavailable', asOf: null, value: null, message: state.message };
  const value = pick(state.value);
  if (value === null || value === undefined) {
    return {
      status: 'unavailable',
      asOf: null,
      value: null,
      message: state.value.attributionMessage ?? MESSAGES.unavailable,
    };
  }
  return { status: state.status, asOf: state.asOf, value, message: state.status === 'stale' ? MESSAGES.stale : null };
}

function withoutSplit<T>(total: T, message: string): Attribution<T> {
  return { total, members: null, unattributed: null, attributionMessage: message };
}

function zeroes(roster: readonly RosterMember[]): Record<string, number> {
  return Object.fromEntries(roster.map((member) => [member.username, 0]));
}

function emptyUnitCount(): UnitCount {
  return { executed: 0, skipped: 0 };
}

function tally(count: UnitCount, testCase: GitLabTestCase): void {
  if (testCase.status === 'skipped') count.skipped += 1;
  else count.executed += 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
