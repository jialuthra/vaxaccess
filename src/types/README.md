# src/types

TypeScript contracts.

- `domain.ts`: records, relationship edges, sources, media and team members (DESIGN.md §4.5).

A few fields are temporarily nullable (coordinates, source `retrievedAt`/`rawPath`, photo `originalUrl`/`width`/`height`) because they come from collection steps that haven't run yet. Release validation must reject those nulls.

## Still to do

- `stats.ts`: statistics response types (Enzo, #31–#34)
