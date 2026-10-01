// Sanitized error descriptions for Lambda logs. Messages from unknown error types are never logged,
// because they could contain upstream text or configuration values.

import { ConfigError } from './config.ts';
import { GitLabError } from './gitlabClient.ts';

export function describeError(err: unknown): Record<string, unknown> {
  if (err instanceof GitLabError) return { name: err.name, kind: err.kind, endpoint: err.endpoint, status: err.status };
  if (err instanceof ConfigError) return { name: err.name, message: err.message };
  return { name: err instanceof Error ? err.name : typeof err };
}
