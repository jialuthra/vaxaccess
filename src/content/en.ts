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
    label: 'Main',
    menu: 'Menu',
  },

  footer: {
    navLabel: 'Footer',
    explore: 'Explore',
    project: 'Project',
    repository: 'Source code on GitLab',
    tagline: 'Vaccine information and historical community vaccination examples for Austin and Travis County.',
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

  vaccinesPage: {
    intro:
      'Each vaccine category summarizes who it is generally for, how it is given and its dose schedule, based on CDC guidance. Details link to the CDC sources and to the historical Austin sites and volunteer activities where that vaccine was offered.',
  },

  vaccineDetail: {
    factsHeading: 'At a glance',
    aboutHeading: 'About this vaccine',
    providerNoteHeading: 'Check with a provider',
    providerNote:
      'This is general information from CDC, not medical advice. Whether and when you should get this vaccine depends on your age, health and vaccination history, so confirm eligibility and timing with a qualified provider.',
    videoHeading: 'Video',
    sitesHeading: 'Sites with documented vaccination activity',
    opportunitiesHeading: 'Volunteer opportunities that supported this vaccine',
    linksHeading: 'Official medical information',
  },

  currentResources: {
    heading: 'Looking for a vaccine now?',
    body: 'The sites below are dated historical examples of community vaccination work, not a current appointment directory. For current clinics, eligibility and costs, use Austin Public Health.',
    homeBody:
      'VaxAccess sites and volunteer activities are dated historical examples, not a current appointment directory. For current clinics, eligibility and costs, use Austin Public Health.',
    link: "Austin Public Health's current immunization resources",
    detailLink: 'Find current vaccination services',
  },

  /** Home splash page (DESIGN.md §4.2). */
  home: {
    heading: 'Vaccination resources for Austin communities.',
    intro:
      'Explore vaccine information and community vaccination resources, with a focus on people who are uninsured or underinsured.',
    historicalNote:
      'Phase I includes historical examples: the sites and volunteer opportunities show community vaccination work that already happened in Austin and Travis County, not services available today.',
    primaryHeading: 'Find vaccination resources',
    sitesHeading: 'Vaccination sites',
    sitesBlurb: 'See where community vaccination events took place, who they served and what they cost.',
    sitesAction: 'Browse vaccination sites',
    vaccinesHeading: 'Vaccines',
    vaccinesBlurb: 'Learn what each vaccine prevents, who it is for and how it is given, based on CDC guidance.',
    vaccinesAction: 'Explore vaccines',
    volunteerHeading: 'Want to help?',
    volunteerBody:
      'Read about past volunteer efforts that supported community vaccination in Austin, and find the organizers behind them.',
    volunteerAction: 'Explore volunteer opportunities',
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
    usedFor: (use: string) => `Used for: ${use}`,
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

  /** About page (DESIGN.md §4.2, §4.9). */
  about: {
    heading: 'About VaxAccess',
    purposeHeading: 'Purpose',
    purpose:
      'VaxAccess helps uninsured and underinsured people in Austin and Travis County understand their vaccination options and find resources. It also shows how community members have supported vaccine access. Phase I is an informational directory: it does not book appointments, accept payments, register volunteers or collect health information.',
    usersHeading: 'Who it is for',
    users: [
      'Residents, especially people who are uninsured or underinsured, looking for vaccine information and where to get vaccinated.',
      'Community members, students and volunteers who want to see how others have supported local vaccination efforts.',
    ],
    historicalNote:
      'The sites and volunteer opportunities are dated historical examples, not a current appointment directory.',

    teamHeading: 'Team',
    gitlabProfile: (username: string) => `GitLab: @${username}`,
    responsibilities: 'Responsibilities',
    missingBio: 'Bio not provided yet.',
    missingPhotoAlt: (name: string) => `${name} has not provided a photo yet`,

    statsHeading: 'Repository statistics',
    definitionsHeading: 'How these numbers are counted',
    definitions: [
      {
        term: 'Commits',
        text: 'Unique commits reachable from the default branch, including merge commits, credited to each commit’s recorded author.',
      },
      {
        term: 'Issues',
        text: 'Open and closed project issues, credited to the member who created them rather than the assignee. Merge requests are not issues.',
      },
      {
        term: 'Unit tests',
        text: 'Distinct unit test cases executed in the most recent default-branch pipeline whose unit job passed. Parameterized cases count separately, skipped cases are shown separately, and browser acceptance tests are not included.',
      },
      {
        term: 'Totals and other contributors',
        text: 'Project totals use the same rules. Contributions from outside the team, or whose author could not be matched, are listed separately so the rows add up to the total.',
      },
      {
        term: 'Freshness',
        text: 'Numbers are read live from GitLab and may be up to five minutes old. If GitLab cannot be reached, the last successful values are shown, marked stale, with the time they were retrieved.',
      },
    ],

    sourcesHeading: 'Data sources',
    toolsHeading: 'Tools',
    tools: [
      { name: 'React, TypeScript and Vite', use: 'Build the single-page site from reusable, type-checked components.' },
      { name: 'React Router', use: 'Defines the 14 page routes and the redirects for unknown pages and records.' },
      { name: 'Bootstrap', use: 'Responsive grid, navigation and form styling, extended with the project palette.' },
      { name: 'Vitest and React Testing Library', use: 'Unit and component tests, run in the CI unit job.' },
      { name: 'Playwright', use: 'Browser acceptance tests in Chromium, Firefox and WebKit.' },
      { name: 'Postman', use: 'Designs and documents the future domain API, with saved request examples.' },
      { name: 'GitLab and GitLab CI', use: 'Source control, issue tracking, and the lint, test and build pipeline.' },
      { name: 'GitLab REST API', use: 'Supplies the commit, issue and unit-test statistics on this page.' },
      { name: 'AWS Lambda', use: 'Runs the read-only statistics service that queries GitLab, so no token reaches the browser.' },
      { name: 'AWS Amplify', use: 'Builds and hosts the site at vaxaccess.me over HTTPS.' },
      { name: 'U.S. Census Geocoder API', use: 'Provided the coordinates and geographic details of each site during data collection.' },
      { name: 'OpenStreetMap and YouTube', use: 'Embedded maps on site and opportunity pages, and the Austin Public Health video on vaccine pages.' },
    ],

    creditsHeading: 'Media credits',
    photosHeading: 'Photographs',
    videoHeading: 'Video',
    teamPhotosHeading: 'Team photos',
    mapsHeading: 'Maps',
    mapCredit: 'Map data and embeds',

    linksHeading: 'Project links',
    repository: 'GitLab repository',
    postman: 'Postman API documentation',
  },

  /** Statistics panel states (DESIGN.md §4.9). */
  stats: {
    loading: 'Loading repository statistics…',
    retry: 'Retry',
    failures: {
      'not-configured': 'Repository statistics are not configured for this build.',
      throttled: 'The statistics service is busy right now. Please try again in a moment.',
      unavailable: 'Repository statistics are unavailable right now.',
      network: 'Could not reach the statistics service.',
      invalid: 'The statistics service returned an unexpected response.',
    },
    refreshFailed: (time: string) => `Could not refresh the statistics. Showing the values retrieved ${time}.`,
    caption: 'Commits, issues and unit tests per team member',
    member: 'Member',
    commits: 'Commits',
    issues: 'Issues',
    unitTests: 'Unit tests',
    unattributed: 'Other contributors',
    total: 'Project total',
    unavailable: 'Unavailable',
    stale: 'Stale',
    skipped: (count: number) => `${count} skipped`,
    asOf: (metric: string, time: string) => `${metric} as of ${time}`,
    pipeline: (id: number, sha: string) => `Unit tests from pipeline #${id} (commit ${sha.slice(0, 8)})`,
    notesHeading: 'Notes',
  },

  notConfigured: 'Not configured',
};
