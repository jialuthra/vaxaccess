// The 14 content pages (DESIGN.md §4.1) and each page's heading.
export const PAGES: readonly { path: string; heading: string }[] = [
  { path: '/', heading: 'Vaccination resources for Austin communities.' },
  { path: '/sites', heading: 'Vaccination sites' },
  { path: '/vaccines', heading: 'Vaccines' },
  { path: '/opportunities', heading: 'Volunteer opportunities' },
  { path: '/sites/travis-county-exposition-center', heading: 'Travis County Exposition Center' },
  { path: '/sites/montopolis-recreation-center', heading: 'Montopolis Recreation and Community Center' },
  { path: '/sites/austin-first-spanish-sda', heading: 'Austin First Spanish SDA Church' },
  { path: '/vaccines/influenza', heading: 'Influenza (flu)' },
  { path: '/vaccines/covid-19', heading: 'COVID-19' },
  { path: '/vaccines/mpox', heading: 'Mpox' },
  { path: '/opportunities/ut-flu-expo-2020', heading: 'UT nursing flu-vaccination support at the Expo Center' },
  { path: '/opportunities/aph-mpox-montopolis-2024', heading: 'Austin–Travis County MRC mpox-clinic support' },
  { path: '/opportunities/vamos-rundberg-2021', heading: 'VAMOS community COVID-19 outreach at Rundberg' },
  { path: '/about', heading: 'About VaxAccess' },
];

export const PAGE_PATHS: ReadonlySet<string> = new Set(PAGES.map((page) => page.path));

export const LISTINGS = [
  { path: '/sites', noun: 'sites' },
  { path: '/vaccines', noun: 'vaccines' },
  { path: '/opportunities', noun: 'opportunities' },
] as const;
