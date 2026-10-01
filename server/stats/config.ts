// Server-only configuration for the statistics Lambda (DESIGN.md §4.14).
// Values come from the Lambda environment; nothing here is bundled into the frontend.

export interface ServerConfig {
  /** `read_api` credential. Pass it only to GitLabClient; never log or return it. */
  gitlabToken: string;
  gitlabProjectPath: string;
}

/** Errors name the missing variable but never echo any configured value. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

export function readServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  return {
    gitlabToken: required(env, 'GITLAB_TOKEN'),
    gitlabProjectPath: required(env, 'GITLAB_PROJECT_PATH'),
  };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is not configured`);
  return value;
}
