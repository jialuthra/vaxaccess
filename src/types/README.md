# src/types

TypeScript contracts.

- `domain.ts`: records, relationship edges, sources, media and team members (DESIGN.md §4.5).
- `stats.ts`: the statistics service response (DESIGN.md §4.9), shared by the Lambda in `server/stats/` and the About page.

A few fields are temporarily nullable (coordinates, source `retrievedAt`/`rawPath`, photo `originalUrl`/`width`/`height`) because they come from collection steps that haven't run yet. Release validation must reject those nulls.
