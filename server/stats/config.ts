// Server-only configuration for the statistics Lambda (DESIGN.md §4.14).
// Values come from the Lambda environment; nothing here is bundled into the frontend.

export interface ServerConfig {
  /** `read_api` credential. Pass it only to GitLabClient; never log or return it. */
  gitlabToken: string;
  gitlabProjectPath: string;
  /**
   * Raw CONTRIBUTOR_MAP JSON. Optional at this level: when missing or invalid, only per-member
   * commit attribution becomes unavailable (see contributors.ts), not the whole service.
   */
  contributorMap: string | undefined;
}

/** Errors name the missing variable but never echo any configured value. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

export function readServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  return {
    gitlabToken: required(env, 'GITLAB_TOKEN'),
    gitlabProjectPath: required(env, 'GITLAB_PROJECT_PATH'),
    contributorMap: env.CONTRIBUTOR_MAP,
  };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is not configured`);
  return value;
}
