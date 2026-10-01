import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStats, isStatsEnvelope } from '../../src/services/statsClient.ts';
import type { StatsEnvelope } from '../../src/types/stats.ts';

const URL = 'https://stats.example.lambda-url.us-east-1.on.aws/';

const group = (value: number | null) => ({
  status: value === null ? 'unavailable' : 'current',
  asOf: value === null ? null : '2026-09-30T12:00:00.000Z',
  value,
  message: null,
});
const unitGroup = (value: number | null) => ({ ...group(value), skipped: value === null ? null : 0 });
const metrics = (n: number | null) => ({ commits: group(n), issues: group(n), unitTests: unitGroup(n) });

const envelope = (): StatsEnvelope =>
  ({
    projectPath: 'nifemisoyemi/cs373-fall-2026-18',
    generatedAt: '2026-09-30T12:00:00.000Z',
    defaultBranch: 'main',
    pipeline: { id: 9, sha: 'abcdef0123', url: 'https://gitlab.com/p/9' },
    members: [{ name: 'Jia Luthra', username: 'jiakl', ...metrics(3) }],
    totals: metrics(3),
    unattributed: metrics(0),
  }) as StatsEnvelope;

function respond(response: Response | Error) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchStats', () => {
  it('returns not configured without making a request when there is no URL', async () => {
    const spy = respond(new Response('{}'));
    expect(await fetchStats(null)).toEqual({ ok: false, reason: 'not-configured' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns a valid envelope with a plain GET and no credentials', async () => {
    const spy = respond(Response.json(envelope()));
    expect(await fetchStats(URL)).toEqual({ ok: true, stats: envelope() });
    expect(spy).toHaveBeenCalledWith(URL, expect.objectContaining({ method: 'GET', credentials: 'omit' }));
  });

  it.each([
    [429, 'throttled'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [404, 'unavailable'],
  ])('treats HTTP %i as %s', async (status, reason) => {
    respond(Response.json({ error: { code: 'x', message: 'y' } }, { status }));
    expect(await fetchStats(URL)).toEqual({ ok: false, reason });
  });

  it('handles network errors and non-JSON responses', async () => {
    respond(new TypeError('Failed to fetch'));
    expect(await fetchStats(URL)).toEqual({ ok: false, reason: 'network' });

    vi.restoreAllMocks();
    respond(new Response('<html>Bad gateway</html>', { status: 200 }));
    expect(await fetchStats(URL)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a JSON body that does not match the contract', async () => {
    respond(Response.json({ ...envelope(), totals: { commits: { value: -1 } } }));
    expect(await fetchStats(URL)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rethrows an abort so callers can ignore it', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(fetchStats(URL, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isStatsEnvelope', () => {
  it('accepts unavailable groups with null values', () => {
    expect(isStatsEnvelope({ ...envelope(), pipeline: null, totals: metrics(null) })).toBe(true);
  });

  it.each([
    ['a fractional count', { totals: { ...metrics(1), commits: group(1.5) } }],
    ['an unknown status', { totals: { ...metrics(1), issues: { ...group(1), status: 'fresh' } } }],
    ['a missing skipped count', { totals: { ...metrics(1), unitTests: group(1) } }],
    ['members that are not an array', { members: {} }],
  ])('rejects %s', (_label, change) => {
    expect(isStatsEnvelope({ ...envelope(), ...change })).toBe(false);
  });
});
