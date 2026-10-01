import { afterEach, describe, expect, it, vi } from 'vitest';
import { readServerConfig } from '../../../server/stats/config.ts';
import { GitLabError } from '../../../server/stats/gitlabClient.ts';
import { createHandler, type FunctionUrlEvent } from '../../../server/stats/handler.ts';

const event = (method: string, rawPath = '/'): FunctionUrlEvent => ({ rawPath, requestContext: { http: { method } } });

const corsHeaders = (headers: Record<string, string>) =>
  Object.keys(headers).filter((name) => name.toLowerCase().startsWith('access-control-'));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('statistics handler', () => {
  it('returns the statistics envelope for GET / with no CORS headers', async () => {
    const handler = createHandler(async () => ({ projectPath: 'a/b' }));
    const result = await handler(event('GET'));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ projectPath: 'a/b' });
    expect(result.headers['Content-Type']).toMatch(/^application\/json/);
    expect(corsHeaders(result.headers)).toEqual([]);
  });

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])('rejects %s with 405 and does no work', async (method) => {
    const loadStats = vi.fn();
    const result = await createHandler(loadStats)(event(method));

    expect(result.statusCode).toBe(405);
    expect(result.headers.Allow).toBe('GET');
    expect(corsHeaders(result.headers)).toEqual([]);
    expect(loadStats).not.toHaveBeenCalled();
  });

  it.each(['/stats', '/api/v4/projects', '//', ''])('rejects unknown path %j with 404', async (path) => {
    const loadStats = vi.fn();
    const result = await createHandler(loadStats)(event('GET', path));

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: { code: 'not_found', message: 'Unknown path.' } });
    expect(loadStats).not.toHaveBeenCalled();
  });

  it('returns a generic 500 and logs only a sanitized error on service failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHandler(async () => {
      throw new GitLabError('http', '/projects/42/issues', 401);
    });
    const result = await handler(event('GET'));

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error.code).toBe('internal_error');
    expect(log).toHaveBeenCalledWith('statistics request failed', {
      name: 'GitLabError',
      kind: 'http',
      endpoint: '/projects/42/issues',
      status: 401,
    });
  });

  it('does not log messages of unexpected errors, which could contain secrets', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHandler(async () => {
      throw new Error('token glpat-secret leaked');
    });
    await handler(event('GET'));

    expect(JSON.stringify(log.mock.calls)).not.toContain('glpat-secret');
  });
});

describe('server configuration', () => {
  it('reads the token and project path from the server environment', () => {
    expect(readServerConfig({ GITLAB_TOKEN: ' glpat-x ', GITLAB_PROJECT_PATH: 'a/b', CONTRIBUTOR_MAP: '{}' })).toEqual({
      gitlabToken: 'glpat-x',
      gitlabProjectPath: 'a/b',
      contributorMap: '{}',
    });
  });

  it('names a missing variable without echoing configured values', () => {
    expect(() => readServerConfig({ GITLAB_PROJECT_PATH: 'secret-ish/path' })).toThrow('GITLAB_TOKEN is not configured');
    expect(() => readServerConfig({ GITLAB_TOKEN: 'glpat-x' })).toThrow(/^GITLAB_PROJECT_PATH is not configured$/);
  });
});
