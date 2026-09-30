// Data collection (DESIGN.md §4.7). Run explicitly with `npm run collect-data`; normal
// builds never run it and never scrape the web.
//
// For every HTML source in src/data/sources.json this fetches the page and keeps compact,
// bounded evidence (title, publication date when the page states one, and short excerpts
// matching the facts we derive from it) in data/raw/<sourceId>.json. For every Site it
// calls the Census Geocoder REST API and keeps the actual JSON responses in
// data/raw/s11-census-geocoder.json. A summary of every request goes to
// data/collection-manifest.json.
//
// The script deliberately does not edit the fixtures in src/data. Collected values are
// copied into the fixtures by hand in a reviewed commit, so a source that changes can never
// silently change published (especially clinical) text.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Site, Source } from '../src/types/domain.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = 'data/raw';
const MANIFEST_PATH = 'data/collection-manifest.json';
const CENSUS_SOURCE_ID = 's11-census-geocoder';
const CENSUS_BENCHMARK = 'Public_AR_Current';

// An honest, descriptive client name. CDC's CDN rejects Node's default agent string.
const USER_AGENT = 'VaxAccess-collector/0.1 (+https://gitlab.com/nifemisoyemi/cs373-fall-2026-18)';
const TIMEOUT_MS = 20_000;
const MAX_EXCERPTS = 10;
const MAX_EXCERPT_LENGTH = 400;

/**
 * What each HTML source is used for: the keywords that locate the relevant passages, so the
 * evidence stays small and on topic instead of copying the whole article.
 */
const EXCERPT_KEYWORDS: Record<string, string[]> = {
  's1-ut-flu-volunteer-notice': ['flu', 'vaccin', 'expo', 'november 7', 'faculty', 'volunteer'],
  's2-fox7-mpox-event': ['mpox', 'monkeypox', 'montopolis', 'medical reserve', 'free', 'jynneos'],
  's3-aph-commission-backup': ['montopolis', 'medical reserve', 'mrc', 'mpox vaccin', 'vaccination event'],
  's4-ut-nursing-vamos': ['vamos', 'rundberg', 'church', 'adventist', 'volunteer', 'wednesday'],
  's5-travis-county-expo': ['7311', 'decker'],
  's6-montopolis-facility': ['1200 montopolis', 'montopolis dr', 'hours'],
  's7-austin-spanish-first-sda': ['rundberg', 'austin, tx', 'map embed'],
  's8a-cdc-flu-basics': ['6 months', 'every season', 'two doses', '2 doses', 'nasal', 'shot'],
  's8b-cdc-flu-key-facts': ['inactivated', 'recombinant', 'live attenuated', 'nasal spray', 'needle', '2 doses', 'two doses', '6 months'],
  's9a-cdc-covid-stay-up-to-date': ['recommend', 'months', 'clinical', 'guidance', 'up to date'],
  's9b-cdc-covid-how-they-work': ['mrna', 'protein', 'novavax', 'injection', 'shot'],
  's10a-cdc-mpox-vaccination': ['jynneos', '2 doses', '4 weeks', '28 days', 'subcutaneous', 'intradermal', 'under 18', 'recommends vaccination'],
  's10b-mmwr-jynneos': ['nonreplicating', 'non-replicating', 'jynneos', 'two-dose', '2-dose'],
  's12-aph-immunizations': ['immuniz', 'vaccin', 'appointment', 'a to z', 'insur'],
  's13a-austin-travis-mrc': ['medical reserve corps', 'volunteer'],
  's13b-ut-mrc': ['medical reserve corps', 'volunteer'],
  's14-ut-nursing': ['school of nursing'],
};

interface SourceEvidence {
  sourceId: string;
  url: string;
  requestUrl: string;
  finalUrl: string;
  retrievedAt: string;
  status: number;
  contentType: string | null;
  /** SHA-256 of the response body, to detect later changes without storing the article. */
  bodySha256: string;
  title: string | null;
  publishedAt: string | null;
  fieldsDerived: string;
  excerpts: string[];
}

interface CensusRequest {
  siteId: string;
  sourceAddress: string;
  endpoint: 'onelineaddress' | 'address';
  requestUrl: string;
  retrievedAt: string;
  status: number;
  benchmark: string;
  accepted: { matchedAddress: string; longitude: number; latitude: number } | null;
  rejectionReason: string | null;
  /** The actual JSON response body. */
  response: unknown;
}

interface CensusMatch {
  matchedAddress: string;
  coordinates: { x: number; y: number };
  addressComponents: { zip: string; fromAddress: string; toAddress: string; streetName: string };
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8')) as T;
}

async function writeJson(relativePath: string, value: unknown): Promise<void> {
  const target = path.join(ROOT, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function get(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
}

// ---------------------------------------------------------------------------
// HTML evidence

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  ge: '≥',
  le: '≤',
  dagger: '†',
  Dagger: '‡',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  eacute: 'é',
  aacute: 'á',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity] ?? ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Addresses shown only in embedded maps (e.g. a Google Maps iframe's `q` parameter), which
 * the text extraction below would otherwise drop. API keys in the URL are not retained.
 */
function mapEmbedAddresses(html: string): string[] {
  const addresses: string[] = [];
  for (const match of html.matchAll(/<iframe[^>]+src=["']([^"']*maps[^"']*)["']/gi)) {
    const query = new URLSearchParams(decodeEntities(match[1] ?? '').split('?')[1] ?? '').get('q');
    if (query) addresses.push(`Map embed address: ${query.replace(/\s+/g, ' ').trim()}`);
  }
  return addresses;
}

/** Visible page text, one block element or bullet per line; hard-wrapped lines are joined. */
function htmlToText(html: string): string {
  const withoutCode = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    // Keep bullets in preformatted text (e.g. archived PDF text) as separate lines.
    .replace(/\n\s*(?=[-•*]\s)/g, '<br>')
    .replace(/\s+/g, ' ');
  const lines = withoutCode
    .replace(/<\/?(p|div|li|h[1-6]|br|tr|td|th|section|article|header|footer|address|dd|dt)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return [...mapEmbedAddresses(html), decodeEntities(lines)]
    .join('\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function pageTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null;
}

/** A publication date the page itself states in metadata; null when it states none. */
function publicationDate(html: string): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date|dc\.date|citation_publication_date)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datePublished)["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const value = pattern.exec(html)?.[1];
    if (value && !Number.isNaN(Date.parse(value))) {
      return value;
    }
  }
  return null;
}

// Evidence must not retain personal contact details unrelated to the project.
function redactContacts(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email removed]')
    .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, '[phone removed]');
}

/**
 * Short passages mentioning the keywords, favoring passages that mention more of them, in
 * page order. Bounded so evidence never becomes a copy of the article.
 */
function excerpts(text: string, keywords: readonly string[]): string[] {
  const candidates: { excerpt: string; score: number; position: number }[] = [];
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    for (const sentence of line.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/)) {
      const lower = sentence.toLowerCase();
      const score = keywords.filter((keyword) => lower.includes(keyword)).length;
      if (sentence.length < 20 || score === 0) {
        continue;
      }
      const clipped = sentence.length > MAX_EXCERPT_LENGTH ? `${sentence.slice(0, MAX_EXCERPT_LENGTH - 1)}…` : sentence;
      const excerpt = redactContacts(clipped);
      if (!seen.has(excerpt)) {
        seen.add(excerpt);
        candidates.push({ excerpt, score, position: candidates.length });
      }
    }
  }
  return candidates
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, MAX_EXCERPTS)
    .sort((a, b) => a.position - b.position)
    .map((candidate) => candidate.excerpt);
}

async function collectHtml(source: Source): Promise<SourceEvidence> {
  const retrievedAt = new Date().toISOString();
  const response = await get(source.url);
  const body = await response.text();
  const text = htmlToText(body);
  return {
    sourceId: source.id,
    url: source.url,
    requestUrl: source.url,
    finalUrl: response.url,
    retrievedAt,
    status: response.status,
    contentType: response.headers.get('content-type'),
    bodySha256: createHash('sha256').update(body).digest('hex'),
    title: response.ok ? pageTitle(body) : null,
    publishedAt: response.ok ? publicationDate(body) : null,
    fieldsDerived: source.usedFor,
    excerpts: response.ok ? excerpts(text, EXCERPT_KEYWORDS[source.id] ?? []) : [],
  };
}

// ---------------------------------------------------------------------------
// Census Geocoder (REST)

const CENSUS_BASE = 'https://geocoding.geo.census.gov/geocoder/locations';

function oneLine(site: Site): string {
  const { street, city, state, postalCode } = site.address;
  return `${street}, ${city}, ${state} ${postalCode}`;
}

/**
 * Accept only a match consistent with the source address: same ZIP, the house number within
 * the matched range, and the first word of the street name present. Never take an unrelated
 * first match.
 */
function checkMatch(site: Site, match: CensusMatch): string | null {
  const houseNumber = Number.parseInt(site.address.street, 10);
  const streetWord = site.address.street.replace(/^\d+\s+/, '').replace(/^(N|S|E|W)\s+/i, '').split(/\s+/)[0] ?? '';
  const components = match.addressComponents;
  const from = Number.parseInt(components.fromAddress, 10);
  const to = Number.parseInt(components.toAddress, 10);
  if (components.zip !== site.address.postalCode) {
    return `ZIP ${components.zip} does not match ${site.address.postalCode}`;
  }
  if (!components.streetName.toUpperCase().includes(streetWord.toUpperCase())) {
    return `Street ${components.streetName} does not match ${site.address.street}`;
  }
  if (Number.isFinite(from) && Number.isFinite(to) && (houseNumber < Math.min(from, to) || houseNumber > Math.max(from, to))) {
    return `House number ${houseNumber} is outside the matched range ${from}–${to}`;
  }
  return null;
}

async function geocode(site: Site, endpoint: CensusRequest['endpoint']): Promise<CensusRequest> {
  const params = new URLSearchParams({ benchmark: CENSUS_BENCHMARK, format: 'json' });
  if (endpoint === 'onelineaddress') {
    params.set('address', oneLine(site));
  } else {
    params.set('street', site.address.street);
    params.set('city', site.address.city);
    params.set('state', site.address.state);
    params.set('zip', site.address.postalCode);
  }
  const requestUrl = `${CENSUS_BASE}/${endpoint}?${params.toString()}`;
  const retrievedAt = new Date().toISOString();
  const response = await get(requestUrl);
  const body: unknown = response.ok ? await response.json() : await response.text();

  const matches = ((body as { result?: { addressMatches?: CensusMatch[] } })?.result?.addressMatches ?? []) as CensusMatch[];
  let accepted: CensusRequest['accepted'] = null;
  const reasons: string[] = [];
  for (const match of matches) {
    const reason = checkMatch(site, match);
    if (reason === null) {
      accepted = { matchedAddress: match.matchedAddress, longitude: match.coordinates.x, latitude: match.coordinates.y };
      break;
    }
    reasons.push(`${match.matchedAddress}: ${reason}`);
  }
  const rejectionReason = accepted
    ? null
    : !response.ok
      ? `HTTP ${response.status}`
      : matches.length === 0
        ? 'No address matches'
        : reasons.join('; ');

  return {
    siteId: site.id,
    sourceAddress: oneLine(site),
    endpoint,
    requestUrl,
    retrievedAt,
    status: response.status,
    benchmark: CENSUS_BENCHMARK,
    accepted,
    rejectionReason,
    response: body,
  };
}

/** One-line matching first; the structured-address endpoint only if that finds no acceptable match. */
async function geocodeSite(site: Site): Promise<CensusRequest[]> {
  const first = await geocode(site, 'onelineaddress');
  return first.accepted ? [first] : [first, await geocode(site, 'address')];
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources = await readJson<Source[]>('src/data/sources.json');
  const sites = await readJson<Site[]>('src/data/sites.json');
  const failures: string[] = [];

  const sourceEntries = [];
  for (const source of sources.filter((candidate) => candidate.kind === 'html')) {
    const rawPath = `${RAW_DIR}/${source.id}.json`;
    try {
      const evidence = await collectHtml(source);
      await writeJson(rawPath, evidence);
      const ok = evidence.status >= 200 && evidence.status < 300;
      if (!ok) failures.push(`${source.id}: HTTP ${evidence.status}`);
      sourceEntries.push({ id: source.id, url: source.url, kind: source.kind, status: evidence.status, retrievedAt: evidence.retrievedAt, publishedAt: evidence.publishedAt, rawPath, ok, excerptCount: evidence.excerpts.length });
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${evidence.status} ${source.id} (${evidence.excerpts.length} excerpts)`);
    } catch (error) {
      failures.push(`${source.id}: ${(error as Error).message}`);
      sourceEntries.push({ id: source.id, url: source.url, kind: source.kind, status: null, retrievedAt: null, publishedAt: null, rawPath: null, ok: false, excerptCount: 0 });
      console.log(`FAIL ${source.id}: ${(error as Error).message}`);
    }
  }

  const censusRequests: CensusRequest[] = [];
  for (const site of sites) {
    try {
      const requests = await geocodeSite(site);
      censusRequests.push(...requests);
      const accepted = requests.at(-1)?.accepted;
      if (!accepted) failures.push(`${site.id}: no acceptable Census match`);
      console.log(`${accepted ? 'ok  ' : 'FAIL'} census ${site.id} → ${accepted ? `${accepted.matchedAddress} (${accepted.latitude}, ${accepted.longitude})` : requests.at(-1)?.rejectionReason}`);
    } catch (error) {
      failures.push(`${site.id}: ${(error as Error).message}`);
      console.log(`FAIL census ${site.id}: ${(error as Error).message}`);
    }
  }

  const censusRawPath = `${RAW_DIR}/${CENSUS_SOURCE_ID}.json`;
  const censusRetrievedAt = censusRequests.at(-1)?.retrievedAt ?? null;
  await writeJson(censusRawPath, { sourceId: CENSUS_SOURCE_ID, benchmark: CENSUS_BENCHMARK, requests: censusRequests });

  await writeJson(MANIFEST_PATH, {
    generatedAt: new Date().toISOString(),
    userAgent: USER_AGENT,
    sources: sourceEntries,
    rest: {
      id: CENSUS_SOURCE_ID,
      rawPath: censusRawPath,
      retrievedAt: censusRetrievedAt,
      sites: censusRequests
        .filter((request) => request.accepted)
        .map((request) => ({
          siteId: request.siteId,
          endpoint: request.endpoint,
          requestUrl: request.requestUrl,
          status: request.status,
          benchmark: request.benchmark,
          matchedAddress: request.accepted?.matchedAddress,
          latitude: request.accepted?.latitude,
          longitude: request.accepted?.longitude,
        })),
    },
    failures,
  });

  console.log(`\nWrote ${MANIFEST_PATH}. ${failures.length === 0 ? 'All requests succeeded.' : `${failures.length} failure(s):`}`);
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main();
