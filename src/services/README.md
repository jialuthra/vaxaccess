# src/services

Data access and shared logic. Pages read data only through these modules, never by importing JSON directly, so a future API can replace the fixtures without changing page code.

| File | Purpose |
| --- | --- |
| `catalog.ts` | Record lookups (`getSite`, `getVaccine`, …), related records in both directions (`getVaccinesForSite`, `getSitesForOpportunity`, …), sources and media (`getSourcesByIds`, `getPhoto`, `getVideo`), the display strings used by cards and filters, and card data (`getSiteCards`, `siteCard`, …). |
| `listing.ts` | Filter and sort rules (DESIGN.md §4.4): trimmed, case-insensitive substring filters combined with AND; sort by name or any field, A–Z/Z–A, with name/ID tie-breakers. |

## Still to do

- `statsClient.ts`: client for the statistics Lambda (Enzo, #34)
