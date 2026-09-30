# data

Collection evidence (DESIGN.md §4.7), produced by `npm run collect-data` (`scripts/collect-data.ts`). Normal builds never run collection.

- `raw/<sourceId>.json`: one file per HTML source in `src/data/sources.json`: request and final URL, retrieval time, HTTP status, a SHA-256 of the response body, the page title and publication date when the page states one, and short excerpts supporting the facts we use. Excerpts are bounded and have email addresses and phone numbers removed; they are evidence, not copies of the articles.
- `raw/s11-census-geocoder.json`: the actual Census Geocoder REST responses for the three Sites (`benchmark=Public_AR_Current`), with the accepted match for each.
- `collection-manifest.json`: a summary of every request, including any failures.

The script never edits `src/data`. Coordinates, `retrievedAt`, `rawPath` and clinical text are copied into the fixtures by hand in a reviewed commit, so a changed source page cannot silently change what the site publishes. Rerunning the script overwrites this evidence; commit it only together with the matching fixture updates.
