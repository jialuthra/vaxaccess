# src/components

Reusable UI pieces shared across pages.

| File | Purpose |
| --- | --- |
| `ModelCard.tsx` | Card for any model: photo with caption and credit, linked name, status badge, five labeled attributes, detail link. Pass `headingLevel={3}` inside sections that already have an `h2`. |
| `ModelListing.tsx` | Everything below a listing page's header: filters, sort, "Showing N of 3" count, zero-match message and card grid. Usage: `<ModelListing kind="sites" cards={getSiteCards()} />`. |
| `ListingControls.tsx` | The collapsible filter panel and sort selectors used by `ModelListing`. |
| `RelatedCards.tsx` | Related-record section for detail pages, e.g. `<RelatedCards heading="Vaccines at this site" cards={getVaccinesForSite(site.id).map(vaccineCard)} noun="vaccines" />`. |
| `StatusBadge.tsx` | Text badge for historical/past/ongoing/upcoming records. |
| `MediaBlock.tsx` | Captioned media for detail pages. `<MediaBlock type="photo" photo={getPhoto(record.photoId)!} />` (pass `lazy={false}` if it is in the first screen), `<MediaBlock type="map" label={site.name} address={formatAddress(site.address)} latitude={site.latitude} longitude={site.longitude} />` (OpenStreetMap), or `<MediaBlock type="video" video={getVideo(vaccine.videoId)!} />` (YouTube, privacy-enhanced, no autoplay). Captions and external links stay outside the iframe. |
| `SourceList.tsx` | Sources section for detail pages: `<SourceList sourceIds={record.sourceIds} verifiedOn={record.verifiedOn} />`. |
| `CurrentResourcesLink.tsx` | Callout linking to Austin Public Health's current immunization resources (Sites listing; reusable on Home). |
| `RedirectNotice.tsx` | Shows the message carried by an unknown-ID redirect. Rendered once in `App.tsx`. |

## Still to do

- `Navbar.tsx`, `Footer.tsx`, `PageLayout.tsx`: Jia (#14)
- `TeamCard.tsx`, `StatsPanel.tsx`: Enzo (#34)
