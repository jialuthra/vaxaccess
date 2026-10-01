import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatsPanel from '../../src/components/StatsPanel.tsx';
import type { StatsFetcher, StatsResult } from '../../src/services/statsClient.ts';
import type { MetricGroup, MetricSet, StatsEnvelope } from '../../src/types/stats.ts';

const URL = 'https://stats.example/';
const AS_OF = '2026-09-30T17:05:00.000Z'; // 12:05 PM in Austin
const FIVE_MINUTES = 5 * 60_000;

const group = (value: number | null, status: MetricGroup['status'] = 'current', message: string | null = null) => ({
  status: value === null ? ('unavailable' as const) : status,
  asOf: value === null ? null : AS_OF,
  value,
  message,
});

const metrics = (commits: number | null, issues: number | null, units: number | null, skipped = 0): MetricSet => ({
  commits: group(commits),
  issues: group(issues),
  unitTests: { ...group(units), skipped: units === null ? null : skipped },
});

function envelope(change: Partial<StatsEnvelope> = {}): StatsEnvelope {
  return {
    projectPath: 'nifemisoyemi/cs373-fall-2026-18',
    generatedAt: AS_OF,
    defaultBranch: 'main',
    pipeline: { id: 4242, sha: 'deadbeefcafe', url: 'https://gitlab.com/p/4242' },
    members: [
      { name: 'Jia Luthra', username: 'jiakl', ...metrics(12, 5, 30) },
      { name: 'Enzo Sagun', username: 'j.enzosagun', ...metrics(0, 2, 44, 1) },
    ],
    unattributed: metrics(3, 1, 0),
    totals: metrics(15, 8, 74, 1),
    ...change,
  };
}

const ok = (stats = envelope()): StatsResult => ({ ok: true, stats });

function fetcherReturning(...results: StatsResult[]) {
  const signals: AbortSignal[] = [];
  let call = 0;
  const fetcher = vi.fn<StatsFetcher>(async (_url, signal) => {
    if (signal) signals.push(signal);
    const result = results[Math.min(call, results.length - 1)]!;
    call += 1;
    return result;
  });
  return { fetcher, signals };
}

const row = (name: string) => screen.getByRole('row', { name: new RegExp(`^${name}`) });

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StatsPanel states', () => {
  it('shows loading, then current per-member, unattributed and total rows', async () => {
    const { fetcher } = fetcherReturning(ok());
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    expect(screen.getByText('Loading repository statistics…')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: /per team member/ })).toBeInTheDocument();

    expect(within(row('Jia Luthra')).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['12', '5', '30']);
    // A real zero is shown as 0, not as unavailable.
    expect(within(row('Enzo Sagun')).getAllByRole('cell')[0]).toHaveTextContent('0');
    expect(within(row('Enzo Sagun')).getAllByRole('cell')[2]).toHaveTextContent('441 skipped');
    expect(within(row('Other contributors')).getAllByRole('cell')[0]).toHaveTextContent('3');
    expect(within(row('Project total')).getAllByRole('cell')[1]).toHaveTextContent('8');
    expect(screen.queryByText('Loading repository statistics…')).not.toBeInTheDocument();
  });

  it('shows metric timestamps and links the unit-test pipeline', async () => {
    const { fetcher } = fetcherReturning(ok());
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    expect(await screen.findByText(/Commits as of Sep 30, 2026, 12:05 PM CT/)).toBeInTheDocument();
    expect(screen.getByText(/Unit tests as of Sep 30, 2026, 12:05 PM CT/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unit tests from pipeline #4242 (commit deadbeef)' })).toHaveAttribute(
      'href',
      'https://gitlab.com/p/4242',
    );
  });

  it('marks stale values and lists service notes once', async () => {
    const staleNote = 'GitLab is unavailable; showing the last successful value.';
    const stale = { ...group(12, 'stale', staleNote) };
    const { fetcher } = fetcherReturning(
      ok(
        envelope({
          members: [{ name: 'Jia Luthra', username: 'jiakl', ...metrics(12, 5, 30), commits: stale }],
          totals: { ...metrics(15, 8, 74), commits: { ...group(15, 'stale', staleNote) } },
        }),
      ),
    );
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    expect(await within(await screen.findByRole('table')).findAllByText('Stale')).toHaveLength(2);
    expect(screen.getAllByText(staleNote)).toHaveLength(1);
  });

  it('shows unavailable values as text, never as zero', async () => {
    const note = 'CONTRIBUTOR_MAP is not configured.';
    const { fetcher } = fetcherReturning(
      ok(
        envelope({
          members: [{ name: 'Jia Luthra', username: 'jiakl', ...metrics(12, 5, 30), commits: group(null, 'unavailable', note) }],
        }),
      ),
    );
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    await screen.findByRole('table');
    expect(within(row('Jia Luthra')).getAllByRole('cell')[0]).toHaveTextContent('Unavailable');
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it('shows a successful zero-case report as 0, distinct from unavailable', async () => {
    const zero = metrics(0, 0, 0);
    const { fetcher } = fetcherReturning(
      ok(
        envelope({
          members: [{ name: 'Jia Luthra', username: 'jiakl', ...zero }],
          unattributed: zero,
          totals: zero,
        }),
      ),
    );
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    await screen.findByRole('table');
    expect(within(row('Project total')).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0', '0', '0']);
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('says statistics are not configured, without a Retry button', async () => {
    const { fetcher } = fetcherReturning({ ok: false, reason: 'not-configured' });
    render(<StatsPanel url={null} fetcher={fetcher} />);

    expect(await screen.findByText('Repository statistics are not configured for this build.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it.each([
    ['throttled', 'The statistics service is busy right now. Please try again in a moment.'],
    ['unavailable', 'Repository statistics are unavailable right now.'],
    ['network', 'Could not reach the statistics service.'],
    ['invalid', 'The statistics service returned an unexpected response.'],
  ] as const)('shows the %s failure and recovers on Retry', async (reason, message) => {
    const { fetcher } = fetcherReturning({ ok: false, reason }, ok());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<StatsPanel url={URL} fetcher={fetcher} />);

    expect(await screen.findByText(message)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('StatsPanel refresh', () => {
  it('refreshes every five minutes while visible', async () => {
    const { fetcher } = fetcherReturning(ok());
    render(<StatsPanel url={URL} fetcher={fetcher} />);
    await screen.findByRole('table');

    await act(() => vi.advanceTimersByTimeAsync(FIVE_MINUTES - 1000));
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('pauses while hidden and catches up when the page becomes visible again', async () => {
    const { fetcher } = fetcherReturning(ok());
    render(<StatsPanel url={URL} fetcher={fetcher} />);
    await screen.findByRole('table');

    act(() => setVisibility('hidden'));
    await act(() => vi.advanceTimersByTimeAsync(3 * FIVE_MINUTES));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => setVisibility('visible'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps the last statistics when a refresh fails, with a Retry action', async () => {
    const { fetcher } = fetcherReturning(ok(), { ok: false, reason: 'throttled' });
    render(<StatsPanel url={URL} fetcher={fetcher} />);
    await screen.findByRole('table');

    await act(() => vi.advanceTimersByTimeAsync(FIVE_MINUTES));
    expect(await screen.findByText(/Could not refresh the statistics\. Showing the values retrieved/)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('cancels the request and stops polling on unmount', async () => {
    const { fetcher, signals } = fetcherReturning(ok());
    const { unmount } = render(<StatsPanel url={URL} fetcher={fetcher} />);
    await screen.findByRole('table');

    unmount();
    expect(signals[0]?.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(3 * FIVE_MINUTES));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aborts a request that a newer refresh supersedes and ignores its late answer', async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst!: (result: StatsResult) => void;
    const fetcher = vi.fn<StatsFetcher>((_url, signal) => {
      signals.push(signal!);
      // The first request hangs; the refresh five minutes later answers at once.
      if (signals.length === 1) return new Promise((resolve) => (resolveFirst = resolve));
      return Promise.resolve(ok());
    });
    render(<StatsPanel url={URL} fetcher={fetcher} />);
    expect(screen.getByText('Loading repository statistics…')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(FIVE_MINUTES));
    expect(signals[0]?.aborted).toBe(true);
    expect(await screen.findByRole('table')).toBeInTheDocument();

    // The superseded request finally answers with a failure; it must change nothing on screen.
    await act(async () => resolveFirst({ ok: false, reason: 'unavailable' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Could not refresh/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('does not poll when statistics are not configured', async () => {
    const { fetcher } = fetcherReturning({ ok: false, reason: 'not-configured' });
    render(<StatsPanel url={null} fetcher={fetcher} />);
    await screen.findByText(/not configured/);

    await act(() => vi.advanceTimersByTimeAsync(3 * FIVE_MINUTES));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
