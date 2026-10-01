import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseContributorMap } from '../../../server/stats/contributors.ts';
import { ROSTER } from '../../../server/stats/roster.ts';

const entry = { emails: ['x@example.com'], names: [] };
const fullMap = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    jiakl: { emails: ['jia@example.com'], names: [] },
    atb2923: { emails: ['alex@example.com'], names: [] },
    'j.enzosagun': { emails: ['enzo@example.com'], names: [] },
    nifemisoyemi: { emails: ['nifemi@example.com'], names: [] },
    lukeyawn: { emails: ['luke@example.com'], names: [] },
    ...overrides,
  });

describe('CONTRIBUTOR_MAP parsing', () => {
  it('parses the committed example, which uses only placeholder aliases', () => {
    const raw = readFileSync('server/config/contributors.example.json', 'utf8');
    const result = parseContributorMap(raw, ROSTER);

    expect(result.ok).toBe(true);
    const aliases = result.ok ? Object.values(result.map) : [];
    expect(aliases).toHaveLength(5);
    for (const { emails, names, userId } of aliases) {
      expect(emails.every((email) => email.endsWith('@example.com'))).toBe(true);
      expect(names.every((name) => name.startsWith('Example Name'))).toBe(true);
      expect(userId).toBeNull();
    }
  });

  it('normalizes emails to lowercase and trims names', () => {
    const result = parseContributorMap(fullMap({ jiakl: { emails: [' Jia@Example.COM '], names: [' Jia L '] } }), ROSTER);
    expect(result.ok && result.map.jiakl).toEqual({ userId: null, emails: ['jia@example.com'], names: ['Jia L'] });
  });

  it.each([
    [undefined, 'CONTRIBUTOR_MAP is not configured.'],
    ['   ', 'CONTRIBUTOR_MAP is not configured.'],
    ['{not json', 'CONTRIBUTOR_MAP is not valid JSON.'],
    ['[]', 'CONTRIBUTOR_MAP must be an object keyed by roster username.'],
  ])('rejects %j', (raw, message) => {
    expect(parseContributorMap(raw, ROSTER)).toEqual({ ok: false, message });
  });

  it('requires every roster member and rejects non-roster usernames', () => {
    const withoutLuke = JSON.parse(fullMap()) as Record<string, unknown>;
    delete withoutLuke.lukeyawn;
    expect(parseContributorMap(JSON.stringify(withoutLuke), ROSTER)).toEqual({
      ok: false,
      message: 'CONTRIBUTOR_MAP has no entry for lukeyawn.',
    });
    expect(parseContributorMap(fullMap({ stranger: entry }), ROSTER).ok).toBe(false);
  });

  it('rejects malformed entries and invalid user IDs', () => {
    expect(parseContributorMap(fullMap({ jiakl: { emails: 'a@b.c', names: [] } }), ROSTER).ok).toBe(false);
    expect(parseContributorMap(fullMap({ jiakl: { ...entry, userId: -1 } }), ROSTER).ok).toBe(false);
    expect(parseContributorMap(fullMap({ jiakl: { ...entry, userId: 42 } }), ROSTER).ok).toBe(true);
  });

  it('rejects an alias shared by two members without revealing it', () => {
    const result = parseContributorMap(
      fullMap({ jiakl: { emails: ['shared@private.dev'], names: [] }, lukeyawn: { emails: ['SHARED@private.dev'], names: [] } }),
      ROSTER,
    );
    expect(result).toEqual({ ok: false, message: 'CONTRIBUTOR_MAP assigns the same alias to more than one member.' });
    expect(JSON.stringify(result)).not.toContain('private.dev');
  });
});
