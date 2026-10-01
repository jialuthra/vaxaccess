// Domain contracts from DESIGN.md §4.5. Fixture JSON in src/data must match these shapes.

/** ISO 8601 date (YYYY-MM-DD) or timestamp string. */
export type IsoDate = string;

export interface ExternalLink {
  label: string;
  /** Absolute HTTPS URL. */
  url: string;
}

/** Map from a factual field key to the source IDs that establish it. */
export type FieldSources = Record<string, string[]>;

export interface CommonRecord {
  /** Stable lowercase slug, also used in the page URL. */
  id: string;
  name: string;
  summary: string;
  descriptionParagraphs: string[];
  photoId: string;
  sourceIds: string[];
  fieldSources: FieldSources;
  externalLinks: ExternalLink[];
  verifiedOn: IsoDate;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export type ServiceContext = 'historical' | 'current';

export interface Site extends CommonRecord {
  address: Address;
  populationServed: string;
  costPolicy: string;
  appointmentMethod: string;
  // Coordinates come from the Census Geocoder collection step. They may be null only
  // during local development; release validation rejects null coordinates.
  latitude: number | null;
  longitude: number | null;
  serviceContext: ServiceContext;
  /** Dated description of the documented activity, e.g. "Mpox vaccination clinic, August 24, 2024". */
  contextLabel: string;
}

export interface Vaccine extends CommonRecord {
  diseasesPrevented: string[];
  ageGroup: string;
  vaccineType: string;
  administrationMethod: string;
  scheduleSummary: string;
  videoId: string;
}

export type OpportunityKind = 'event' | 'ongoing';
export type OpportunityStatus = 'upcoming' | 'ongoing' | 'past';
export type DatePrecision = 'day' | 'month' | 'year' | 'unspecified';

export interface VolunteerOpportunity extends CommonRecord {
  organization: string;
  activityType: string;
  /** Duration or cadence of participation. Never contains a calendar date. */
  timeCommitment: string;
  requirements: string[];
  kind: OpportunityKind;
  /** Explicit in fixture data; does not change with the browser clock. */
  status: OpportunityStatus;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  datePrecision: DatePrecision;
  dateLabel: string;
  applicationUrl: string | null;
  organizerUrl: string;
}

/** Evidence shared by every relationship edge. */
export interface EdgeEvidence {
  sourceIds: string[];
  /** Explains the documented connection. */
  context: string;
  historical: boolean;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  datePrecision: DatePrecision;
}

export interface SiteVaccineEdge extends EdgeEvidence {
  siteId: string;
  vaccineId: string;
}

export interface OpportunitySiteEdge extends EdgeEvidence {
  opportunityId: string;
  siteId: string;
}

export interface OpportunityVaccineEdge extends EdgeEvidence {
  opportunityId: string;
  vaccineId: string;
}

/** Each edge is stored once; reverse navigation is derived by the catalog service. */
export interface Relationships {
  siteVaccine: SiteVaccineEdge[];
  opportunitySite: OpportunitySiteEdge[];
  opportunityVaccine: OpportunityVaccineEdge[];
}

export type SourceKind = 'html' | 'rest';

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: SourceKind;
  // Filled by scripts/collect-data.ts; null until the source has been collected.
  retrievedAt: IsoDate | null;
  publishedAt: IsoDate | null;
  /** Path of the retained evidence under data/raw/; null until collected. */
  rawPath: string | null;
  usedFor: string;
}

export interface Photograph {
  id: string;
  /** Public path, e.g. /images/site-expo.jpg */
  localPath: string;
  sourcePageUrl: string;
  // The fields below are filled when the image is downloaded and optimized.
  originalUrl: string | null;
  creator: string;
  licenseName: string;
  licenseUrl: string;
  caption: string;
  alt: string;
  changes: string;
  width: number | null;
  height: number | null;
}

export interface Video {
  id: string;
  title: string;
  publisher: string;
  watchUrl: string;
  embedUrl: string;
  caption: string;
}

/**
 * A team-supplied headshot. Unlike `Photograph` there is no public source page or license
 * URL: the member provided it and agreed to its use, which `credit` records.
 */
export interface TeamPhoto {
  id: string;
  /** Public path, e.g. /images/team/team-jia.jpg */
  localPath: string;
  /** "Provided by <name>, used with permission" */
  credit: string;
  alt: string;
  width: number;
  height: number;
}

export interface MediaCatalog {
  photos: Photograph[];
  videos: Video[];
  teamPhotos: TeamPhoto[];
}

export interface TeamMember {
  name: string;
  username: string;
  phaseRole: string;
  bio: string | null;
  /** A `TeamPhoto` ID; null shows the neutral placeholder. */
  photoId: string | null;
  responsibilities: string[];
}
