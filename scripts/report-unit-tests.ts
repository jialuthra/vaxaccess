// Runs in the CI `unit` job after Vitest, whether or not the tests passed (DESIGN.md §4.9, §4.13):
//   1. writes reports/unit-test-owners.json from tests/test-owners.json, stamped with this
//      pipeline's ID and commit SHA so the statistics Lambda can tie ownership to the exact report;
//   2. normalizes reports/junit.xml in place so each classname carries file path + suite name.
// Exits nonzero if either output cannot be produced or test identities are not unique.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  buildOwnershipArtifact,
  normalizeJUnit,
  parseOwners,
  unownedFiles,
} from './lib/unitTestReport.ts';

const JUNIT_PATH = 'reports/junit.xml';
const OWNERS_PATH = 'tests/test-owners.json';
const ARTIFACT_PATH = 'reports/unit-test-owners.json';

let failed = false;

const inCi = process.env.CI === 'true';
const pipelineId = process.env.CI_PIPELINE_ID ? Number(process.env.CI_PIPELINE_ID) : null;
const sha = process.env.CI_COMMIT_SHA ?? null;
if (inCi && (pipelineId === null || !Number.isInteger(pipelineId) || !sha)) {
  console.error('CI_PIPELINE_ID and CI_COMMIT_SHA are required in CI.');
  process.exit(1);
}
if (!inCi) console.log('Not running in CI: the ownership artifact will have a null pipeline ID and SHA.');

// The ownership artifact comes first so it is published even if the JUnit report is missing.
const owners = parseOwners(JSON.parse(readFileSync(OWNERS_PATH, 'utf8')));
writeFileSync(ARTIFACT_PATH, `${JSON.stringify(buildOwnershipArtifact(owners, pipelineId, sha), null, 2)}\n`);
console.log(`Wrote ${ARTIFACT_PATH} (${Object.keys(owners).length} owned files).`);

if (!existsSync(JUNIT_PATH)) {
  console.error(`${JUNIT_PATH} is missing; Vitest did not produce a report.`);
  process.exit(1);
}

const report = normalizeJUnit(readFileSync(JUNIT_PATH, 'utf8'), process.cwd());
writeFileSync(JUNIT_PATH, report.xml);
console.log(`Normalized ${JUNIT_PATH} (${report.files.length} test files).`);

const unowned = unownedFiles(report.files, owners);
if (unowned.length > 0) {
  // Not fatal: these cases still count toward the project total, as unattributed.
  console.warn(`Add these files to ${OWNERS_PATH} so their tests are attributed:\n  ${unowned.join('\n  ')}`);
}

if (report.duplicates.length > 0) {
  // Identical identities would be deduplicated by the Lambda, undercounting tests.
  console.error(`Test names must be unique within each suite (include parameter labels):\n  ${report.duplicates.join('\n  ')}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
