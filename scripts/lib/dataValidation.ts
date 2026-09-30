// Fixture integrity rules (DESIGN.md §4.5, §4.13 "Data integrity"). Pure functions with no
// file-system access, so unit tests can run them against modified copies of the fixtures;
// scripts/validate-data.ts supplies the real files.

import type {
  EdgeEvidence,
  MediaCatalog,
  Relationships,
  Site,
  Source,
  Vaccine,
  VolunteerOpportunity,
} from '../../src/types/domain.ts';

export interface Fixtures {
  sites: Site[];
  vaccines: Vaccine[];
  opportunities: VolunteerOpportunity[];
  relationships: Relationships;
  sources: Source[];
  media: MediaCatalog;
}

export interface ValidationOptions {
  /** Whether a repository-relative path exists, e.g. `data/raw/s1.json` or `public/images/a.jpg`. */
  fileExists: (relativePath: string) => boolean;
}

export const RECORDS_PER_MODEL = 3;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

// A calendar date in any common form: ISO, numeric, a year, or a month name.
const DATE_LIKE =
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(?:19|20)\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

// Travis County, generously bounded. Catches swapped or sign-flipped coordinates.
const AUSTIN_BOUNDS = { minLat: 29.9, maxLat: 30.7, minLon: -98.2, maxLon: -97.3 };

const SITE_STRINGS = ['populationServed', 'costPolicy', 'appointmentMethod', 'contextLabel'] as const;
const VACCINE_STRINGS = ['ageGroup', 'vaccineType', 'administrationMethod', 'scheduleSummary', 'videoId'] as const;
const OPPORTUNITY_STRINGS = ['organization', 'activityType', 'timeCommitment', 'dateLabel'] as const;
const PHOTO_STRINGS = ['creator', 'licenseName', 'caption', 'alt', 'changes'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Every rule violation as a readable message; an empty array means the fixtures are valid. */
export function validateFixtures(fixtures: Fixtures, options: ValidationOptions): string[] {
  const errors: string[] = [];
  const error = (message: string) => errors.push(message);

  const { sites, vaccines, opportunities, relationships, sources, media } = fixtures;
  const sourceIds = new Set(sources.map((source) => source.id));
  const photoIds = new Set(media.photos.map((photo) => photo.id));
  const videoIds = new Set(media.videos.map((video) => video.id));

  // --- Sources
  for (const id of duplicates(sources.map((source) => source.id))) error(`sources: duplicate ID "${id}"`);
  for (const source of sources) {
    const at = `sources/${source.id}`;
    if (!SLUG.test(source.id)) error(`${at}: ID is not a lowercase slug`);
    for (const key of ['title', 'publisher', 'usedFor'] as const) {
      if (!isNonEmptyString(source[key])) error(`${at}: ${key} is required`);
    }
    if (!isHttpsUrl(source.url)) error(`${at}: url must be an absolute HTTPS URL`);
    if (source.kind !== 'html' && source.kind !== 'rest') error(`${at}: kind must be html or rest`);
    if (!isIsoTimestamp(source.retrievedAt)) error(`${at}: retrievedAt must be an ISO UTC timestamp from collection`);
    if (source.publishedAt !== null && !isIsoDate(source.publishedAt)) error(`${at}: publishedAt must be null or an ISO date`);
    if (!isNonEmptyString(source.rawPath)) {
      error(`${at}: rawPath is required (collection evidence)`);
    } else if (!source.rawPath.startsWith('data/raw/') || !options.fileExists(source.rawPath)) {
      error(`${at}: evidence file ${source.rawPath} is missing from data/raw/`);
    }
  }
  if (!sources.some((source) => source.kind === 'rest' && isNonEmptyString(source.rawPath) && options.fileExists(source.rawPath))) {
    error('sources: no REST source has retained evidence');
  }

  // --- Media
  for (const id of duplicates(media.photos.map((photo) => photo.id))) error(`media: duplicate photo ID "${id}"`);
  for (const path of duplicates(media.photos.map((photo) => photo.localPath))) error(`media: photo file ${path} is used twice`);
  for (const photo of media.photos) {
    const at = `media/photos/${photo.id}`;
    for (const key of PHOTO_STRINGS) {
      if (!isNonEmptyString(photo[key])) error(`${at}: ${key} is required`);
    }
    for (const key of ['sourcePageUrl', 'originalUrl', 'licenseUrl'] as const) {
      if (!isHttpsUrl(photo[key])) error(`${at}: ${key} must be an absolute HTTPS URL`);
    }
    if (!isPositiveInteger(photo.width) || !isPositiveInteger(photo.height)) error(`${at}: width and height must be positive integers`);
    if (!/^\/images\/[\w.-]+$/.test(photo.localPath) || !options.fileExists(`public${photo.localPath}`)) {
      error(`${at}: image file public${photo.localPath} is missing`);
    }
  }
  for (const video of media.videos) {
    const at = `media/videos/${video.id}`;
    for (const key of ['title', 'publisher', 'caption'] as const) {
      if (!isNonEmptyString(video[key])) error(`${at}: ${key} is required`);
    }
    if (!isHttpsUrl(video.watchUrl) || !isHttpsUrl(video.embedUrl)) error(`${at}: watchUrl and embedUrl must be HTTPS URLs`);
  }

  // --- Records (common fields)
  const models = [
    ['sites', sites],
    ['vaccines', vaccines],
    ['opportunities', opportunities],
  ] as const;
  const recordPhotoIds: string[] = [];
  for (const [model, records] of models) {
    if (records.length !== RECORDS_PER_MODEL) error(`${model}: expected ${RECORDS_PER_MODEL} records, found ${records.length}`);
    for (const id of duplicates(records.map((record) => record.id))) error(`${model}: duplicate ID "${id}"`);
    for (const record of records) {
      const at = `${model}/${record.id}`;
      if (!SLUG.test(record.id)) error(`${at}: ID is not a lowercase slug`);
      if (!isNonEmptyString(record.name)) error(`${at}: name is required`);
      if (!isNonEmptyString(record.summary)) error(`${at}: summary is required`);
      if (!isNonEmptyStringArray(record.descriptionParagraphs)) error(`${at}: descriptionParagraphs must be nonempty strings`);
      if (!isIsoDate(record.verifiedOn)) error(`${at}: verifiedOn must be an ISO date`);
      if (!photoIds.has(record.photoId)) error(`${at}: unknown photo "${record.photoId}"`);
      recordPhotoIds.push(record.photoId);
      if (!isNonEmptyStringArray(record.sourceIds)) error(`${at}: sourceIds must not be empty`);
      for (const sourceId of record.sourceIds ?? []) {
        if (!sourceIds.has(sourceId)) error(`${at}: unknown source "${sourceId}"`);
      }
      for (const [field, ids] of Object.entries(record.fieldSources ?? {})) {
        if (!isNonEmptyStringArray(ids)) error(`${at}: fieldSources.${field} must list at least one source`);
        for (const sourceId of ids ?? []) {
          if (!sourceIds.has(sourceId)) error(`${at}: fieldSources.${field} cites unknown source "${sourceId}"`);
          else if (!record.sourceIds.includes(sourceId)) error(`${at}: fieldSources.${field} cites "${sourceId}", which is not in sourceIds`);
        }
      }
      for (const link of record.externalLinks ?? []) {
        if (!isNonEmptyString(link.label) || !isHttpsUrl(link.url)) error(`${at}: external link "${link.label}" needs a label and an HTTPS URL`);
      }
    }
  }
  // Nine distinct card photographs.
  for (const photoId of duplicates(recordPhotoIds)) error(`records: photo "${photoId}" is used by more than one card`);

  // --- Model-specific fields
  for (const site of sites) {
    const at = `sites/${site.id}`;
    for (const key of ['street', 'city', 'state', 'postalCode'] as const) {
      if (!isNonEmptyString(site.address?.[key])) error(`${at}: address.${key} is required`);
    }
    for (const key of SITE_STRINGS) {
      if (!isNonEmptyString(site[key])) error(`${at}: ${key} is required`);
    }
    if (site.serviceContext !== 'historical' && site.serviceContext !== 'current') error(`${at}: serviceContext must be historical or current`);
    const { latitude, longitude } = site;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      error(`${at}: coordinates are required from Census collection`);
    } else if (
      latitude < AUSTIN_BOUNDS.minLat ||
      latitude > AUSTIN_BOUNDS.maxLat ||
      longitude < AUSTIN_BOUNDS.minLon ||
      longitude > AUSTIN_BOUNDS.maxLon
    ) {
      error(`${at}: coordinates (${latitude}, ${longitude}) are outside the Austin area`);
    }
  }

  for (const vaccine of vaccines) {
    const at = `vaccines/${vaccine.id}`;
    if (!isNonEmptyStringArray(vaccine.diseasesPrevented)) error(`${at}: diseasesPrevented must be nonempty strings`);
    for (const key of VACCINE_STRINGS) {
      if (!isNonEmptyString(vaccine[key])) error(`${at}: ${key} is required`);
    }
    if (!videoIds.has(vaccine.videoId)) error(`${at}: unknown video "${vaccine.videoId}"`);
  }

  for (const opportunity of opportunities) {
    const at = `opportunities/${opportunity.id}`;
    for (const key of OPPORTUNITY_STRINGS) {
      if (!isNonEmptyString(opportunity[key])) error(`${at}: ${key} is required`);
    }
    if (!isNonEmptyStringArray(opportunity.requirements)) error(`${at}: requirements must be nonempty strings`);
    if (opportunity.kind !== 'event' && opportunity.kind !== 'ongoing') error(`${at}: kind must be event or ongoing`);
    if (!['upcoming', 'ongoing', 'past'].includes(opportunity.status)) error(`${at}: status must be upcoming, ongoing or past`);
    errors.push(...validateDates(at, opportunity));
    // Dates belong in startDate/endDate/dateLabel, never in the time commitment.
    if (DATE_LIKE.test(opportunity.timeCommitment ?? '')) error(`${at}: timeCommitment must not contain a date`);
    if (!isHttpsUrl(opportunity.organizerUrl)) error(`${at}: organizerUrl must be an HTTPS URL`);
    if (opportunity.applicationUrl !== null && !isHttpsUrl(opportunity.applicationUrl)) {
      error(`${at}: applicationUrl must be null or an HTTPS URL`);
    }
    // Past activities never offer a signup.
    if (opportunity.status === 'past' && opportunity.applicationUrl !== null) error(`${at}: a past activity must not have an applicationUrl`);
  }

  // --- Relationships
  const siteIds = new Set(sites.map((site) => site.id));
  const vaccineIds = new Set(vaccines.map((vaccine) => vaccine.id));
  const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
  type EdgeKey = 'siteId' | 'vaccineId' | 'opportunityId';
  interface EdgeCollection {
    name: keyof Relationships;
    edges: readonly (EdgeEvidence & Partial<Record<EdgeKey, string>>)[];
    fromKey: EdgeKey;
    toKey: EdgeKey;
  }
  const idsByKey: Record<EdgeKey, Set<string>> = { siteId: siteIds, vaccineId: vaccineIds, opportunityId: opportunityIds };
  const collections: EdgeCollection[] = [
    { name: 'siteVaccine', edges: relationships.siteVaccine, fromKey: 'siteId', toKey: 'vaccineId' },
    { name: 'opportunitySite', edges: relationships.opportunitySite, fromKey: 'opportunityId', toKey: 'siteId' },
    { name: 'opportunityVaccine', edges: relationships.opportunityVaccine, fromKey: 'opportunityId', toKey: 'vaccineId' },
  ];
  // Record ID → the ID keys of the other models it connects to.
  const connections = new Map<string, Set<EdgeKey>>();
  const connect = (id: string, key: EdgeKey) => connections.set(id, (connections.get(id) ?? new Set()).add(key));

  for (const { name, edges, fromKey, toKey } of collections) {
    const pairs: string[] = [];
    edges.forEach((edge, index) => {
      const from = edge[fromKey];
      const to = edge[toKey];
      const at = `relationships/${name}[${index}]`;
      const fromValid = from !== undefined && idsByKey[fromKey].has(from);
      const toValid = to !== undefined && idsByKey[toKey].has(to);
      if (!fromValid) error(`${at}: unknown ${fromKey} "${String(from)}"`);
      if (!toValid) error(`${at}: unknown ${toKey} "${String(to)}"`);
      if (fromValid && toValid) {
        pairs.push(`${from} → ${to}`);
        connect(from, toKey);
        connect(to, fromKey);
      }
      if (!isNonEmptyStringArray(edge.sourceIds)) error(`${at}: sourceIds must not be empty`);
      for (const sourceId of edge.sourceIds ?? []) {
        if (!sourceIds.has(sourceId)) error(`${at}: unknown source "${sourceId}"`);
      }
      if (!isNonEmptyString(edge.context)) error(`${at}: context is required`);
      if (typeof edge.historical !== 'boolean') error(`${at}: historical must be a boolean`);
      errors.push(...validateDates(at, edge));
    });
    for (const pair of duplicates(pairs)) error(`relationships/${name}: duplicate edge ${pair}`);
  }

  // Every record connects to at least one instance of each other model.
  const required = [
    ['sites', sites, ['vaccineId', 'opportunityId']],
    ['vaccines', vaccines, ['siteId', 'opportunityId']],
    ['opportunities', opportunities, ['siteId', 'vaccineId']],
  ] as const;
  const modelNames: Record<EdgeKey, string> = { siteId: 'site', vaccineId: 'vaccine', opportunityId: 'opportunity' };
  for (const [model, records, keys] of required) {
    for (const record of records) {
      for (const key of keys) {
        if (!connections.get(record.id)?.has(key)) error(`${model}/${record.id}: not connected to any ${modelNames[key]}`);
      }
    }
  }

  return errors;
}

type DatedEvidence = Pick<EdgeEvidence, 'startDate' | 'endDate' | 'datePrecision'>;

/** Nullable ISO dates, a known precision, and start no later than end. */
function validateDates(at: string, value: DatedEvidence): string[] {
  const errors: string[] = [];
  if (!['day', 'month', 'year', 'unspecified'].includes(value.datePrecision)) {
    errors.push(`${at}: datePrecision must be day, month, year or unspecified`);
  }
  for (const key of ['startDate', 'endDate'] as const) {
    if (value[key] !== null && !isIsoDate(value[key])) errors.push(`${at}: ${key} must be null or an ISO date`);
  }
  if (value.datePrecision === 'day' && value.startDate === null) errors.push(`${at}: day precision requires a startDate`);
  if (isIsoDate(value.startDate) && isIsoDate(value.endDate) && value.startDate > value.endDate) {
    errors.push(`${at}: startDate is after endDate`);
  }
  return errors;
}
