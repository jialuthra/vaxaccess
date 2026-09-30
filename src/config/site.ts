// Public site configuration. Only non-secret values belong here; the GitLab token lives
// solely in the statistics Lambda environment.

/** Optional public URL from the build environment; null renders as "Not configured". */
function optionalUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const siteConfig = {
  name: 'VaxAccess',
  domain: 'vaxaccess.me',
  productionUrl: 'https://vaxaccess.me',
  repositoryUrl: 'https://gitlab.com/nifemisoyemi/cs373-fall-2026-18',
  /** Current immunization resources; prominently linked because Phase I records are historical. */
  currentResourcesUrl: 'https://www.austintexas.gov/health/programs/immunizations',
  statsUrl: optionalUrl(import.meta.env.VITE_STATS_URL),
  postmanUrl: optionalUrl(import.meta.env.VITE_POSTMAN_URL),
} as const;
