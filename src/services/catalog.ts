// Catalog service: the only module that reads the bundled fixtures (DESIGN.md §2, §4.4).
// Pages call these functions instead of importing JSON, so a future API can replace the
// implementation without changing page code.

import mediaJson from '../data/media.json';
import opportunitiesJson from '../data/opportunities.json';
import relationshipsJson from '../data/relationships.json';
import sitesJson from '../data/sites.json';
import sourcesJson from '../data/sources.json';
import teamJson from '../data/team.json';
import vaccinesJson from '../data/vaccines.json';
import type {
  Address,
  MediaCatalog,
  Photograph,
  Relationships,
  Site,
  Source,
  TeamMember,
  TeamPhoto,
  Vaccine,
  Video,
  VolunteerOpportunity,
} from '../types/domain.ts';
import { compareText, type ListingItem } from './listing.ts';

// JSON imports are widened to plain strings; the fixtures are checked against these
// contracts by scripts/validate-data.ts.
const sites = sitesJson as Site[];
const vaccines = vaccinesJson as Vaccine[];
const opportunities = opportunitiesJson as VolunteerOpportunity[];
const relationships = relationshipsJson as Relationships;
const sources = sourcesJson as Source[];
const media = mediaJson as MediaCatalog;
const team = teamJson as TeamMember[];

export type ModelKind = 'sites' | 'vaccines' | 'opportunities';

/** Card field keys in display order (DESIGN.md §4.4). Labels live in src/content/en.ts. */
export const SITE_FIELDS = ['address', 'populationServed', 'costPolicy', 'appointmentMethod', 'vaccines'] as const;
export const VACCINE_FIELDS = [
  'diseasesPrevented',
  'ageGroup',
  'vaccineType',
  'administrationMethod',
  'scheduleSummary',
] as const;
export const OPPORTUNITY_FIELDS = ['organization', 'activityType', 'timeCommitment', 'requirements', 'vaccines'] as const;

export type SiteFieldKey = (typeof SITE_FIELDS)[number];
export type VaccineFieldKey = (typeof VACCINE_FIELDS)[number];
export type OpportunityFieldKey = (typeof OPPORTUNITY_FIELDS)[number];

export const MODEL_FIELDS = {
  sites: SITE_FIELDS,
  vaccines: VACCINE_FIELDS,
  opportunities: OPPORTUNITY_FIELDS,
} as const;

export type FieldKeyOf<M extends ModelKind> = (typeof MODEL_FIELDS)[M][number];

/** Status shown as a badge on cards, in addition to the five fields. */
export type CardBadge = 'historical' | 'past' | 'ongoing' | 'upcoming';

/** Everything a card needs: display strings for filtering/sorting plus presentation data. */
export interface CardData<M extends ModelKind> extends ListingItem<FieldKeyOf<M>> {
  kind: M;
  href: string;
  photo: Photograph | undefined;
  badge: CardBadge | null;
}

/** A card of any model, e.g. for components that render all three kinds. */
export type AnyCardData = { [M in ModelKind]: CardData<M> }[ModelKind];

const byName = <T extends { name: string }>(a: T, b: T): number => compareText(a.name, b.name);

function findById<T extends { id: string }>(records: readonly T[], id: string): T | undefined {
  return records.find((record) => record.id === id);
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

// ---------------------------------------------------------------------------
// Records

export function getSites(): Site[] {
  return [...sites];
}

export function getSite(id: string): Site | undefined {
  return findById(sites, id);
}

export function getVaccines(): Vaccine[] {
  return [...vaccines];
}

export function getVaccine(id: string): Vaccine | undefined {
  return findById(vaccines, id);
}

export function getOpportunities(): VolunteerOpportunity[] {
  return [...opportunities];
}

export function getOpportunity(id: string): VolunteerOpportunity | undefined {
  return findById(opportunities, id);
}

export function hasRecord(kind: ModelKind, id: string): boolean {
  switch (kind) {
    case 'sites':
      return getSite(id) !== undefined;
    case 'vaccines':
      return getVaccine(id) !== undefined;
    case 'opportunities':
      return getOpportunity(id) !== undefined;
  }
}

export function getRecordCount(kind: ModelKind): number {
  switch (kind) {
    case 'sites':
      return sites.length;
    case 'vaccines':
      return vaccines.length;
    case 'opportunities':
      return opportunities.length;
  }
}

/** The catalog is small enough to show on one page; this summary ignores active filters. */
export function getCatalogSummary(kind: ModelKind): { instances: number; pages: number; page: number } {
  return { instances: getRecordCount(kind), pages: 1, page: 1 };
}

export function detailPath(kind: ModelKind, id: string): string {
  return `/${kind}/${id}`;
}

// ---------------------------------------------------------------------------
// Relationships. Each edge is stored once; both directions are derived here.
// Related records are returned in name order.

export function getVaccinesForSite(siteId: string): Vaccine[] {
  return relationships.siteVaccine
    .filter((edge) => edge.siteId === siteId)
    .map((edge) => getVaccine(edge.vaccineId))
    .filter(defined)
    .sort(byName);
}

export function getOpportunitiesForSite(siteId: string): VolunteerOpportunity[] {
  return relationships.opportunitySite
    .filter((edge) => edge.siteId === siteId)
    .map((edge) => getOpportunity(edge.opportunityId))
    .filter(defined)
    .sort(byName);
}

export function getSitesForVaccine(vaccineId: string): Site[] {
  return relationships.siteVaccine
    .filter((edge) => edge.vaccineId === vaccineId)
    .map((edge) => getSite(edge.siteId))
    .filter(defined)
    .sort(byName);
}

export function getOpportunitiesForVaccine(vaccineId: string): VolunteerOpportunity[] {
  return relationships.opportunityVaccine
    .filter((edge) => edge.vaccineId === vaccineId)
    .map((edge) => getOpportunity(edge.opportunityId))
    .filter(defined)
    .sort(byName);
}

export function getSitesForOpportunity(opportunityId: string): Site[] {
  return relationships.opportunitySite
    .filter((edge) => edge.opportunityId === opportunityId)
    .map((edge) => getSite(edge.siteId))
    .filter(defined)
    .sort(byName);
}

export function getVaccinesForOpportunity(opportunityId: string): Vaccine[] {
  return relationships.opportunityVaccine
    .filter((edge) => edge.opportunityId === opportunityId)
    .map((edge) => getVaccine(edge.vaccineId))
    .filter(defined)
    .sort(byName);
}

export function getRelationships(): Relationships {
  return relationships;
}

// ---------------------------------------------------------------------------
// Sources and media

export function getSource(id: string): Source | undefined {
  return findById(sources, id);
}

/** Sources in the order given; unknown IDs are skipped. */
export function getSourcesByIds(ids: readonly string[]): Source[] {
  return ids.map(getSource).filter(defined);
}

export function getSources(): Source[] {
  return [...sources];
}

export function getPhoto(id: string): Photograph | undefined {
  return findById(media.photos, id);
}

export function getVideo(id: string): Video | undefined {
  return findById(media.videos, id);
}

/** Every photograph, for the About page's media credits. */
export function getPhotos(): Photograph[] {
  return [...media.photos];
}

export function getVideos(): Video[] {
  return [...media.videos];
}

// ---------------------------------------------------------------------------
// Team (About page)

/** The five team members in roster order (DESIGN.md §4.9). */
export function getTeam(): TeamMember[] {
  return [...team];
}

/** A member's headshot; undefined when `photoId` is null or unknown, so the page shows the placeholder. */
export function getTeamPhoto(id: string | null): TeamPhoto | undefined {
  return id === null ? undefined : findById(media.teamPhotos, id);
}

export function getTeamPhotos(): TeamPhoto[] {
  return [...media.teamPhotos];
}

// ---------------------------------------------------------------------------
// Display strings. Cards, filters, sorting and API examples all use these exact strings.

export function formatAddress(address: Address): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
}

function joinList(items: readonly string[]): string {
  return items.join(', ');
}

/** Related vaccine names, A–Z, joined with ", ". */
function vaccineNames(related: readonly Vaccine[]): string {
  return joinList(related.map((vaccine) => vaccine.name).sort(compareText));
}

export function siteValues(site: Site): Record<SiteFieldKey, string> {
  return {
    address: formatAddress(site.address),
    populationServed: site.populationServed,
    costPolicy: site.costPolicy,
    appointmentMethod: site.appointmentMethod,
    vaccines: vaccineNames(getVaccinesForSite(site.id)),
  };
}

export function vaccineValues(vaccine: Vaccine): Record<VaccineFieldKey, string> {
  return {
    diseasesPrevented: joinList(vaccine.diseasesPrevented),
    ageGroup: vaccine.ageGroup,
    vaccineType: vaccine.vaccineType,
    administrationMethod: vaccine.administrationMethod,
    scheduleSummary: vaccine.scheduleSummary,
  };
}

export function opportunityValues(opportunity: VolunteerOpportunity): Record<OpportunityFieldKey, string> {
  return {
    organization: opportunity.organization,
    activityType: opportunity.activityType,
    timeCommitment: opportunity.timeCommitment,
    requirements: joinList(opportunity.requirements),
    vaccines: vaccineNames(getVaccinesForOpportunity(opportunity.id)),
  };
}

// ---------------------------------------------------------------------------
// Cards

export function siteCard(site: Site): CardData<'sites'> {
  return {
    kind: 'sites',
    id: site.id,
    name: site.name,
    href: detailPath('sites', site.id),
    photo: getPhoto(site.photoId),
    badge: site.serviceContext === 'historical' ? 'historical' : null,
    values: siteValues(site),
  };
}

export function vaccineCard(vaccine: Vaccine): CardData<'vaccines'> {
  return {
    kind: 'vaccines',
    id: vaccine.id,
    name: vaccine.name,
    href: detailPath('vaccines', vaccine.id),
    photo: getPhoto(vaccine.photoId),
    badge: null,
    values: vaccineValues(vaccine),
  };
}

export function opportunityCard(opportunity: VolunteerOpportunity): CardData<'opportunities'> {
  return {
    kind: 'opportunities',
    id: opportunity.id,
    name: opportunity.name,
    href: detailPath('opportunities', opportunity.id),
    photo: getPhoto(opportunity.photoId),
    badge: opportunity.status,
    values: opportunityValues(opportunity),
  };
}

export function getSiteCards(): CardData<'sites'>[] {
  return sites.map(siteCard);
}

export function getVaccineCards(): CardData<'vaccines'>[] {
  return vaccines.map(vaccineCard);
}

export function getOpportunityCards(): CardData<'opportunities'>[] {
  return opportunities.map(opportunityCard);
}
