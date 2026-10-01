// CONTRIBUTOR_MAP parsing (DESIGN.md §4.9, §4.14). The real map lives only in Lambda configuration;
// server/config/contributors.example.json shows its shape. Validation messages never echo aliases,
// which are private email addresses and names.

import type { RosterMember } from './roster.ts';

export interface ContributorAliases {
  /** Team-verified GitLab user ID, cross-checked against the ID resolved from the username. */
  userId: number | null;
  /** Commit author emails, matched case-insensitively. */
  emails: string[];
  /** Commit author names, matched exactly (after trimming); never approximately. */
  names: string[];
}

export type ContributorMap = Record<string, ContributorAliases>;

export type ContributorMapResult = { ok: true; map: ContributorMap } | { ok: false; message: string };

export function parseContributorMap(raw: string | undefined, roster: readonly RosterMember[]): ContributorMapResult {
  if (!raw?.trim()) return invalid('CONTRIBUTOR_MAP is not configured.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalid('CONTRIBUTOR_MAP is not valid JSON.');
  }
  if (!isRecord(parsed)) return invalid('CONTRIBUTOR_MAP must be an object keyed by roster username.');

  const usernames = new Set(roster.map((member) => member.username));
  if (Object.keys(parsed).some((key) => !usernames.has(key))) {
    return invalid('CONTRIBUTOR_MAP contains a username that is not on the roster.');
  }

  const map: ContributorMap = {};
  const owners = new Map<string, string>();
  for (const { username } of roster) {
    const entry = parsed[username];
    if (!isRecord(entry)) return invalid(`CONTRIBUTOR_MAP has no entry for ${username}.`);

    const { userId = null, emails, names } = entry;
    if ((userId !== null && !isPositiveInteger(userId)) || !isStringArray(emails) || !isStringArray(names)) {
      return invalid(`CONTRIBUTOR_MAP entry for ${username} is malformed.`);
    }

    const aliases = {
      userId,
      emails: emails.map(normalizeEmail).filter(Boolean),
      names: names.map(normalizeName).filter(Boolean),
    };
    // An alias claimed by two members would make attribution depend on lookup order.
    for (const key of [...aliases.emails.map((e) => `email:${e}`), ...aliases.names.map((n) => `name:${n}`)]) {
      const owner = owners.get(key);
      if (owner !== undefined && owner !== username) {
        return invalid('CONTRIBUTOR_MAP assigns the same alias to more than one member.');
      }
      owners.set(key, username);
    }
    map[username] = aliases;
  }
  return { ok: true, map };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string): string {
  return name.trim();
}

function invalid(message: string): ContributorMapResult {
  return { ok: false, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
