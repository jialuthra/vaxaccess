# src/data

Bundled JSON fixtures, matching the types in `src/types/domain.ts`. The data is read only through `src/services/catalog.ts`.

| File | Contents |
| --- | --- |
| `sites.json`, `vaccines.json`, `opportunities.json` | Three records each, seeded from DESIGN.md §4.6 |
| `relationships.json` | Nine edges (site–vaccine, opportunity–site, opportunity–vaccine). Each is stored once; reverse links are derived. |
| `sources.json` | Sources S1–S14 (S8, S9, S10 and S13 are split into two entries each because they have two URLs) |
| `media.json` | Metadata for the nine card photos, plus the Austin Public Health video |

Unknown facts are written as "Not stated in the historical source."; never fill them with guesses.

## Still to do

- Coordinates (`latitude`/`longitude`) are `null` until Census Geocoder collection runs (Alex, #25, #26)
- `retrievedAt` and `rawPath` on sources are `null` until collection (Alex, #25)
- Photo `originalUrl`, `width`, `height` and `changes` are `null`/empty until the images are downloaded; check the alt text against the real images (Alex, #28)
- Verify the vaccine clinical text against the cited CDC pages (Alex, #27)
- `team.json` with member profiles (Jia, #42)
