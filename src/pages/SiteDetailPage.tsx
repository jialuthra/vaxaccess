import { useId } from 'react';
import MediaBlock from '../components/MediaBlock.tsx';
import RelatedCards from '../components/RelatedCards.tsx';
import SourceList from '../components/SourceList.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import { siteConfig } from '../config/site.ts';
import { en } from '../content/en.ts';
import {
  formatAddress,
  getOpportunitiesForSite,
  getPhoto,
  getVaccinesForSite,
  opportunityCard,
  vaccineCard,
} from '../services/catalog.ts';
import type { Site } from '../types/domain.ts';

// Site detail (DESIGN.md §4.2). A historical Site describes one documented event, not the
// building's current services, so the dated context and the link to current services
// come first.
export default function SiteDetailPage({ site }: { site: Site }) {
  const strings = en.siteDetail;
  const ids = { context: useId(), access: useId(), location: useId(), links: useId() };
  const historical = site.serviceContext === 'historical';
  const address = formatAddress(site.address);
  const photo = getPhoto(site.photoId);

  return (
    <div className="container py-4">
      <h1>{site.name}</h1>
      {historical && (
        <p className="mb-2">
          <StatusBadge status="historical" />
        </p>
      )}
      <p className="lead">{site.summary}</p>

      <section className="historical-notice p-3 my-4" aria-labelledby={ids.context}>
        <h2 id={ids.context} className="h5">
          {strings.documentedActivity}
        </h2>
        <p className="fw-semibold mb-2">{site.contextLabel}</p>
        {historical && <p>{strings.historicalNote}</p>}
        <a className="btn btn-primary" href={siteConfig.currentResourcesUrl}>
          {en.currentResources.detailLink}
        </a>
      </section>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <section aria-labelledby={ids.access}>
            <h2 id={ids.access} className="h4">
              {strings.accessHeading}
            </h2>
            <dl className="detail-facts p-3">
              <dt>{strings.costPolicy}</dt>
              <dd>{site.costPolicy}</dd>
              <dt>{strings.populationServed}</dt>
              <dd>{site.populationServed}</dd>
              <dt>{strings.appointmentMethod}</dt>
              <dd className="mb-0">{site.appointmentMethod}</dd>
            </dl>
          </section>
          <div className="prose">
            {site.descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-5">{photo && <MediaBlock type="photo" photo={photo} lazy={false} />}</div>
      </div>

      <section className="my-4" aria-labelledby={ids.location}>
        <h2 id={ids.location} className="h4">
          {strings.locationHeading}
        </h2>
        <address className="mb-3">{address}</address>
        <div className="row">
          <div className="col-12 col-lg-8">
            <MediaBlock
              type="map"
              label={site.name}
              address={address}
              latitude={site.latitude}
              longitude={site.longitude}
              caption={historical ? strings.mapCaption(site.name) : undefined}
            />
          </div>
        </div>
      </section>

      <RelatedCards
        heading={strings.vaccinesHeading}
        cards={getVaccinesForSite(site.id).map(vaccineCard)}
        noun={en.models.vaccines.plural}
      />
      <RelatedCards
        heading={strings.opportunitiesHeading}
        cards={getOpportunitiesForSite(site.id).map(opportunityCard)}
        noun={en.models.opportunities.plural}
      />

      {site.externalLinks.length > 0 && (
        <section className="my-4" aria-labelledby={ids.links}>
          <h2 id={ids.links} className="h4">
            {strings.linksHeading}
          </h2>
          <ul>
            {site.externalLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SourceList sourceIds={site.sourceIds} verifiedOn={site.verifiedOn} />
    </div>
  );
}
