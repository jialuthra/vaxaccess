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
    opportunities: { title: 'Volunteer opportunities', singular: 'opportunity', plural: 'opportunities' },
  } satisfies Record<ModelKind, { title: string; singular: string; plural: string }>,

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

  vaccinesPage: {
    intro:
      'Each vaccine category summarizes who it is generally for, how it is given and its dose schedule, based on CDC guidance. Details link to the CDC sources and to the historical Austin sites and volunteer activities where that vaccine was offered.',
  },

  currentResources: {
    heading: 'Looking for a vaccine now?',
    body: 'The sites below are dated historical examples of community vaccination work, not a current appointment directory. For current clinics, eligibility and costs, use Austin Public Health.',
    link: "Austin Public Health's current immunization resources",
    detailLink: 'Find current vaccination services',
  },

  sitesPage: {
    intro:
      'Austin-area places where community vaccination activity was documented. Each site lists who the activity served, what it cost and how people got vaccinated, as far as the historical source states, and links to the related vaccines and volunteer opportunities.',
  },

  siteDetail: {
    accessHeading: 'Access details',
    costPolicy: 'Cost/payment',
    populationServed: 'Population and eligibility',
    appointmentMethod: 'Appointment method',
    documentedActivity: 'Documented activity',
    historicalNote:
      'This page describes a documented past event. It does not mean this venue offers vaccinations today, and its normal operating hours are not vaccination hours.',
    locationHeading: 'Location',
    mapCaption: (name: string) => `Event-location context: ${name}. The marker shows the address from the source.`,
    vaccinesHeading: 'Vaccines with documented activity at this site',
    opportunitiesHeading: 'Volunteer opportunities at this site',
    linksHeading: 'External links',
  },

  media: {
    photoCredit: 'Photo',
    license: 'License',
    viewFullImage: 'View full image and source',
    mapTitle: (label: string) => `OpenStreetMap of ${label}`,
    mapAttribution: '© OpenStreetMap contributors',
    openMap: 'Open in OpenStreetMap',
    mapUnavailable: 'Map coordinates have not been collected yet.',
    videoTitle: (title: string, publisher: string) => `${title} (${publisher}) video`,
    watchVideo: (publisher: string) => `Watch on YouTube (${publisher})`,
  },

  sources: {
    heading: 'Sources',
    published: (date: string) => `Published ${date}`,
    retrieved: (date: string) => `Retrieved ${date}`,
    restApi: 'REST API',
    verifiedOn: (date: string) => `Facts on this page verified ${date}.`,
  },

  related: {
    noneDocumented: (noun: string) => `No related ${noun} are documented.`,
  },

  redirect: {
    unknownRecord: (singular: string, pluralNoun: string) =>
      `We couldn't find that ${singular}. Here are all ${pluralNoun} instead.`,
  },

  notConfigured: 'Not configured',
};
