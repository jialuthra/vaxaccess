# src/components

Reusable UI pieces shared across pages.

| File | Purpose |
| --- | --- |
| `ModelCard.tsx` | Card for any model: photo with caption and credit, linked name, status badge, five labeled attributes, detail link. Pass `headingLevel={3}` inside sections that already have an `h2`. |
| `ModelListing.tsx` | Everything below a listing page's header: filters, sort, "Showing N of 3" count, zero-match message and card grid. Usage: `<ModelListing kind="sites" cards={getSiteCards()} />`. |
| `ListingControls.tsx` | The collapsible filter panel and sort selectors used by `ModelListing`. |
| `RelatedCards.tsx` | Related-record section for detail pages, e.g. `<RelatedCards heading="Vaccines at this site" cards={getVaccinesForSite(site.id).map(vaccineCard)} noun="vaccines" />`. |
| `StatusBadge.tsx` | Text badge for historical/past/ongoing/upcoming records. |
| `RedirectNotice.tsx` | Shows the message carried by an unknown-ID redirect. Rendered once in `App.tsx`. |

## Still to do

- `Navbar.tsx`, `Footer.tsx`, `PageLayout.tsx`: Jia (#14)
- `MediaBlock.tsx` (photo, OpenStreetMap, YouTube embeds) and `SourceList.tsx`: Nifemi (#20), reused by Alex and Enzo
- `TeamCard.tsx`, `StatsPanel.tsx`: Enzo (#34)
