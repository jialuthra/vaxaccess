// Fixture integrity check (DESIGN.md §4.13). Run with `npm run validate-data`; CI runs it in
// the check stage. The rules live in scripts/lib/dataValidation.ts.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateFixtures, validateTeam, type Fixtures } from './lib/dataValidation.ts';
import type { TeamMember } from '../src/types/domain.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8')) as T;
}

const fixtures: Fixtures = {
  sites: await readJson('src/data/sites.json'),
  vaccines: await readJson('src/data/vaccines.json'),
  opportunities: await readJson('src/data/opportunities.json'),
  relationships: await readJson('src/data/relationships.json'),
  sources: await readJson('src/data/sources.json'),
  media: await readJson('src/data/media.json'),
};
const team: TeamMember[] = await readJson('src/data/team.json');

const options = { fileExists: (relativePath: string) => existsSync(path.join(ROOT, relativePath)) };
const errors = [...validateFixtures(fixtures, options), ...validateTeam(team, fixtures.media.teamPhotos, options)];

if (errors.length === 0) {
  console.log('Data validation passed.');
} else {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exitCode = 1;
}
