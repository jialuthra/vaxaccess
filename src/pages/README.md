# src/pages

One component per page type. `src/routes.tsx` maps the 14 URLs to them. Detail routes look up the record first and pass it in as a prop (`site`, `vaccine` or `opportunity`); unknown IDs never reach these components.

Every page has exactly one `<h1>`. The routing tests in `tests/unit/routes.test.tsx` check each page's heading, so update the test if you change a heading.

## Still to do

Still placeholders unless noted:

| File | Owner | Issue |
| --- | --- | --- |
| `HomePage.tsx` | Jia | #23 |
| `SitesPage.tsx`, `SiteDetailPage.tsx` (done) | Nifemi | #17, #20 |
| `VaccinesPage.tsx`, `VaccineDetailPage.tsx` | Alex | #18, #21 |
| `OpportunitiesPage.tsx`, `OpportunityDetailPage.tsx` | Enzo | #19, #22 |
| `AboutPage.tsx` | Enzo | #34 |

On listing pages, keep the catalog summary line and add `<ModelListing kind="…" cards={…} />`. On detail pages, use `RelatedCards` for both related models and follow DESIGN.md §4.2 for the historical wording.
