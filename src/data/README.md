# src/data

Bundled JSON fixtures, matching the types in `src/types/domain.ts`. The data is read only through `src/services/catalog.ts`.

| File | Contents |
| --- | --- |
| `sites.json`, `vaccines.json`, `opportunities.json` | Three records each, seeded from DESIGN.md §4.6 |
| `relationships.json` | Nine edges (site–vaccine, opportunity–site, opportunity–vaccine). Each is stored once; reverse links are derived. |
| `sources.json` | Sources S1–S14 (S8, S9, S10 and S13 are split into two entries each because they have two URLs) |
| `media.json` | Metadata for the nine card photos, the Austin Public Health video, and `teamPhotos` (team-provided headshots credited "Provided by <name>, used with permission") |
| `team.json` | The five team members (DESIGN.md §4.9). `photoId` refers to `media.json` `teamPhotos`; null shows the placeholder. Read through `getTeam()`/`getTeamPhoto()` in the catalog |

Site coordinates come from the Census Geocoder responses in `data/raw/s11-census-geocoder.json` (rounded to six decimal places), and each source's `retrievedAt`/`rawPath` points at its evidence in `data/raw/` (see `data/README.md`).

Unknown facts are written as "Not stated in the historical source."; never fill them with guesses.
