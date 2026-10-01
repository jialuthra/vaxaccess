// Lambda function URL routing for the statistics service (DESIGN.md §4.9).
//
// The only resource is GET on the function URL root. CORS is configured on the function URL
// itself, which also answers preflight requests, so this handler must not emit any
// Access-Control-* header: duplicates make browsers reject the response.

import { readServerConfig } from './config.ts';
import { describeError } from './logging.ts';
import { createStatsService, type StatsService } from './service.ts';

/** The subset of the function URL (payload v2.0) event this handler reads. */
export interface FunctionUrlEvent {
  rawPath?: string;
  requestContext?: { http?: { method?: string } };
}

export interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** Produces the statistics envelope; aggregation and caching live behind this (#32). */
export type StatsLoader = () => Promise<unknown>;

export const STATS_PATH = '/';

export function createHandler(loadStats: StatsLoader) {
  return async (event: FunctionUrlEvent): Promise<FunctionUrlResult> => {
    const method = event.requestContext?.http?.method?.toUpperCase() ?? '';
    const path = event.rawPath ?? '';

    if (path !== STATS_PATH) return errorResponse(404, 'not_found', 'Unknown path.');
    if (method !== 'GET') return errorResponse(405, 'method_not_allowed', 'Only GET is supported.', { Allow: 'GET' });

    try {
      return jsonResponse(200, await loadStats());
    } catch (err) {
      // Log only a sanitized description; error messages from unknown sources are not trusted.
      console.error('statistics request failed', describeError(err));
      return errorResponse(500, 'internal_error', 'Statistics are temporarily unavailable.');
    }
  };
}

// One service per execution environment, so its cache survives across warm invocations.
let service: StatsService | undefined;

/** Lambda entry point. Configuration is read on first use so a missing variable becomes a logged 500. */
export const handler = createHandler(() => {
  service ??= createStatsService({ config: readServerConfig() });
  return service.load();
});

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): FunctionUrlResult {
  return jsonResponse(statusCode, { error: { code, message } }, headers);
}

function jsonResponse(statusCode: number, body: unknown, headers: Record<string, string> = {}): FunctionUrlResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}
