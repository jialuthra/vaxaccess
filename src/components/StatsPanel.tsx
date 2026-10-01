import { useCallback, useEffect, useState } from 'react';
import { en } from '../content/en.ts';
import { formatDateTime } from '../content/format.ts';
import { STATS_REFRESH_MS, fetchStats, type StatsFailure, type StatsFetcher } from '../services/statsClient.ts';
import type { MetricGroup, MetricSet, StatsEnvelope, UnitTestMetricGroup } from '../types/stats.ts';

// Live GitLab statistics for About (DESIGN.md §4.9). The rest of About is static and stays usable
// whatever happens here: loading, a failed first request, or a failed refresh after data arrived.

type PanelState =
  | { phase: 'loading' }
  | { phase: 'failed'; reason: StatsFailure }
  /** `refreshFailure` is set when a later refresh failed; the earlier statistics stay on screen. */
  | { phase: 'loaded'; stats: StatsEnvelope; refreshFailure: StatsFailure | null };

/**
 * Requests statistics on mount, then every `intervalMs` while the page is visible. A tab that comes
 * back after the interval refreshes at once. Timers, listeners and the in-flight request are all
 * cancelled on unmount.
 */
export function useStats(url: string | null, fetcher: StatsFetcher = fetchStats, intervalMs = STATS_REFRESH_MS) {
  const [state, setState] = useState<PanelState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let controller: AbortController | null = null;
    let lastRequestAt = 0;

    const load = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      lastRequestAt = Date.now();
      try {
        const result = await fetcher(url, current.signal);
        if (current.signal.aborted) return;
        setState((previous) => {
          if (result.ok) return { phase: 'loaded', stats: result.stats, refreshFailure: null };
          return previous.phase === 'loaded'
            ? { ...previous, refreshFailure: result.reason }
            : { phase: 'failed', reason: result.reason };
        });
      } catch {
        // Aborted: unmounted, retried or superseded. Nothing to show.
      }
    };

    void load();
    // Without a configured endpoint there is nothing to poll.
    if (!url) return () => controller?.abort();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, intervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRequestAt >= intervalMs) void load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controller?.abort();
    };
  }, [url, fetcher, intervalMs, attempt]);

  const retry = useCallback(() => {
    setState((previous) => (previous.phase === 'failed' ? { phase: 'loading' } : previous));
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

interface StatsPanelProps {
  url: string | null;
  fetcher?: StatsFetcher;
  intervalMs?: number;
}

export default function StatsPanel({ url, fetcher, intervalMs }: StatsPanelProps) {
  const { state, retry } = useStats(url, fetcher, intervalMs);
  const strings = en.stats;

  return (
    <div className="stats-panel">
      <div aria-live="polite">
        {state.phase === 'loading' && <p className="text-body-secondary">{strings.loading}</p>}
        {state.phase === 'failed' && <p className="stats-alert">{strings.failures[state.reason]}</p>}
        {state.phase === 'loaded' && state.refreshFailure && (
          <p className="stats-alert">{strings.refreshFailed(formatDateTime(state.stats.generatedAt))}</p>
        )}
      </div>
      {((state.phase === 'failed' && state.reason !== 'not-configured') ||
        (state.phase === 'loaded' && state.refreshFailure)) && (
        <button type="button" className="btn btn-primary btn-sm mb-3" onClick={retry}>
          {strings.retry}
        </button>
      )}
      {state.phase === 'loaded' && <StatsTable stats={state.stats} />}
    </div>
  );
}

const METRICS = ['commits', 'issues', 'unitTests'] as const;

function StatsTable({ stats }: { stats: StatsEnvelope }) {
  const strings = en.stats;
  const rows: { label: string; metrics: MetricSet; isTotal?: boolean }[] = [
    ...stats.members.map((member) => ({ label: member.name, metrics: member })),
    { label: strings.unattributed, metrics: stats.unattributed },
    { label: strings.total, metrics: stats.totals, isTotal: true },
  ];
  // Each metric's timestamp is shared by every row (they come from one GitLab read), so show it once.
  const timestamps = METRICS.flatMap((metric) => {
    const asOf = stats.totals[metric].asOf;
    return asOf ? [strings.asOf(strings[metric], formatDateTime(asOf))] : [];
  });
  const notes = [
    ...new Set(rows.flatMap(({ metrics }) => METRICS.map((metric) => metrics[metric].message))),
  ].filter((note): note is string => note !== null);

  return (
    <>
      <div className="table-responsive">
        <table className="table stats-table align-middle">
          <caption className="caption-top">{strings.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{strings.member}</th>
              {METRICS.map((metric) => (
                <th key={metric} scope="col" className="text-end">
                  {strings[metric]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, metrics, isTotal }) => (
              <tr key={label} className={isTotal ? 'stats-total' : undefined}>
                <th scope="row">{label}</th>
                <MetricCell group={metrics.commits} />
                <MetricCell group={metrics.issues} />
                <MetricCell group={metrics.unitTests} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="source-meta small mb-1">{timestamps.join(' · ')}</p>
      {stats.pipeline && (
        <p className="source-meta small">
          <a href={stats.pipeline.url}>{strings.pipeline(stats.pipeline.id, stats.pipeline.sha)}</a>
        </p>
      )}
      {notes.length > 0 && (
        <div className="small">
          <h3 className="h6 mb-1">{strings.notesHeading}</h3>
          <ul className="mb-0">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function MetricCell({ group }: { group: MetricGroup | UnitTestMetricGroup }) {
  const strings = en.stats;
  // Unavailable is shown as text, never as a zero.
  if (group.status === 'unavailable' || group.value === null) {
    return <td className="text-end text-body-secondary">{strings.unavailable}</td>;
  }
  const skipped = 'skipped' in group ? group.skipped : null;
  return (
    <td className="text-end">
      {group.value}
      {group.status === 'stale' && <span className="badge stats-stale ms-2">{strings.stale}</span>}
      {skipped !== null && skipped > 0 && <span className="d-block small text-body-secondary">{strings.skipped(skipped)}</span>}
    </td>
  );
}
