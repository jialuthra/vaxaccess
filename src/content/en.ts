// English interface strings. Keep user-facing UI copy here so it can be localized later.
// (Fixture prose in src/data is English-only in Phase I.)

import type { CardBadge, FieldKeyOf, ModelKind } from '../services/catalog.ts';

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const en = {
  siteName: 'VaxAccess',

  nav: {
    home: 'Home',
    sites: 'Sites',
    vaccines: 'Vaccines',
    opportunities: 'Volunteer opportunities',
    about: 'About',
    skipToContent: 'Skip to main content',
  },

  models: {
    sites: { title: 'Vaccination sites', singular: 'site', plural: 'sites' },
    vaccines: { title: 'Vaccines', singular: 'vaccine', plural: 'vaccines' },
    opportunities: { title: 'Volunteer opportunities', singular: 'opportunity', 
                    plural: 'opportunities', description: 'Ways to volunteer with vaccine access programs!'}
  } satisfies Record<ModelKind, { title: string; singular: string; plural: string; description?: string}>,

  /** Card attribute labels (DESIGN.md §4.4). */
  fieldLabels: {
    sites: {
      address: 'Address',
      populationServed: 'Population served',
      costPolicy: 'Cost/payment',
      appointmentMethod: 'Appointment method',
      vaccines: 'Offered vaccines',
    },
    vaccines: {
      diseasesPrevented: 'Diseases prevented',
      ageGroup: 'Intended age group',
      vaccineType: 'Vaccine type',
      administrationMethod: 'Administration',
      scheduleSummary: 'Dose/schedule',
    },
    opportunities: {
      organization: 'Organization',
      activityType: 'Activity',
      timeCommitment: 'Time commitment',
      requirements: 'Requirements',
      vaccines: 'Supported vaccines',
    },
  } satisfies { [M in ModelKind]: Record<FieldKeyOf<M>, string> },

  badges: {
    historical: 'Historical example',
    past: 'Past activity',
    ongoing: 'Ongoing',
    upcoming: 'Upcoming',
  } satisfies Record<CardBadge, string>,

  listing: {
    catalogSummary: (instances: number, pages: number, page: number) =>
      `${instances} ${plural(instances, 'instance', 'instances')} · ${pages} ${plural(pages, 'page', 'pages')} · Page ${page} of ${pages}`,
    showing: (shown: number, total: number, noun: string) => `Showing ${shown} of ${total} ${noun}`,
    filtersHeading: 'Filter and sort',
    showFilters: 'Show filters',
    hideFilters: 'Hide filters',
    filterPlaceholder: 'Contains…',
    sortBy: 'Sort by',
    sortByName: 'Name',
    direction: 'Direction',
    ascending: 'A–Z',
    descending: 'Z–A',
    clearFilters: 'Clear filters',
    noMatches: (noun: string) => `No ${noun} match these filters.`,
    viewDetails: 'View details',
    photoSource: 'Photo source',
  },

  related: {
    noneDocumented: (noun: string) => `No related ${noun} are documented.`,
  },

  redirect: {
    unknownRecord: (singular: string, pluralNoun: string) =>
      `We couldn't find that ${singular}. Here are all ${pluralNoun} instead.`,
  },

  opportunityDetail: {
    pastNotice: 'Past activity — not accepting signups through this listing.',
    viewHistoricalSource: 'View historical source',
    exploreOrganizer: 'Explore organizer information',
    signUp: 'Sign up',
    detailsHeading: 'Details',
    dateLabel: 'Date',
    statusLabel: 'Status',
    noEndDate: 'Ongoing — no end date',
    dateNotStated: 'Date not stated',
    aboutHeading: 'About this opportunity',
    locationHeading: 'Location',
    relatedSites: 'Related sites',
    relatedVaccines: 'Related vaccines',
  },

  media: {
    photoCredit: 'Photo',
    license: 'License',
    viewFullImage: 'View full image',
    mapTitle: (label: string) => `Map of ${label}`,
    mapUnavailable: 'Map unavailable: location coordinates are not recorded yet.',
    mapAttribution: '© OpenStreetMap contributors',
    openMap: 'Open in OpenStreetMap',
    videoTitle: (title: string, publisher: string) => `${title} (${publisher})`,
    watchVideo: (publisher: string) => `Watch on YouTube (${publisher})`,
  },

  sources: {
    heading: 'Sources',
    restApi: 'REST API',
    published: (date: string) => `Published ${date}`,
    retrieved: (date: string) => `Retrieved ${date}`,
    verifiedOn: (date: string) => `Last verified ${date}`,
  },

  vaccinesPage: {
    intro: 'Vaccines offered at the documented Austin-area sites and volunteer activities.',
  },

  notConfigured: 'Not configured',
};
