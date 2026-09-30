import { useId } from 'react';
import MediaBlock from '../components/MediaBlock.tsx';
import RelatedCards from '../components/RelatedCards.tsx';
import SourceList from '../components/SourceList.tsx';
import { siteConfig } from '../config/site.ts';
import { en } from '../content/en.ts';
import {
  getOpportunitiesForVaccine,
  getPhoto,
  getSitesForVaccine,
  getVideo,
  opportunityCard,
  siteCard,
  VACCINE_FIELDS,
  vaccineValues,
} from '../services/catalog.ts';
import type { Vaccine } from '../types/domain.ts';

// Vaccine detail (DESIGN.md §4.2). A Vaccine is a category, not a product. Related Sites
// are places with documented past activity, never a claim that the vaccine is available
// there today, and clinical facts are paired with a note to confirm with a provider.
export default function VaccineDetailPage({ vaccine }: { vaccine: Vaccine }) {
  const strings = en.vaccineDetail;
  const labels = en.fieldLabels.vaccines;
  const ids = { note: useId(), facts: useId(), about: useId(), video: useId(), links: useId() };
  const values = vaccineValues(vaccine);
  const photo = getPhoto(vaccine.photoId);
  const video = getVideo(vaccine.videoId);

  return (
    <div className="container py-4">
      <h1>{vaccine.name}</h1>
      <p className="lead">{vaccine.summary}</p>

      <section className="historical-notice p-3 my-4" aria-labelledby={ids.note}>
        <h2 id={ids.note} className="h5">
          {strings.providerNoteHeading}
        </h2>
        <p>{strings.providerNote}</p>
        <a className="btn btn-primary" href={siteConfig.currentResourcesUrl}>
          {en.currentResources.detailLink}
        </a>
      </section>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <section aria-labelledby={ids.facts}>
            <h2 id={ids.facts} className="h4">
              {strings.factsHeading}
            </h2>
            <dl className="detail-facts p-3">
              {VACCINE_FIELDS.map((key, index) => (
                <div key={key}>
                  <dt>{labels[key]}</dt>
                  <dd className={index === VACCINE_FIELDS.length - 1 ? 'mb-0' : undefined}>{values[key]}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="prose" aria-labelledby={ids.about}>
            <h2 id={ids.about} className="h4">
              {strings.aboutHeading}
            </h2>
            {vaccine.descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </div>
        <div className="col-12 col-lg-5">{photo && <MediaBlock type="photo" photo={photo} lazy={false} />}</div>
      </div>

      {video && (
        <section className="my-4" aria-labelledby={ids.video}>
          <h2 id={ids.video} className="h4">
            {strings.videoHeading}
          </h2>
          <div className="row">
            <div className="col-12 col-lg-8">
              <MediaBlock type="video" video={video} />
            </div>
          </div>
        </section>
      )}

      <RelatedCards
        heading={strings.sitesHeading}
        cards={getSitesForVaccine(vaccine.id).map(siteCard)}
        noun={en.models.sites.plural}
      />
      <RelatedCards
        heading={strings.opportunitiesHeading}
        cards={getOpportunitiesForVaccine(vaccine.id).map(opportunityCard)}
        noun={en.models.opportunities.plural}
      />

      {vaccine.externalLinks.length > 0 && (
        <section className="my-4" aria-labelledby={ids.links}>
          <h2 id={ids.links} className="h4">
            {strings.linksHeading}
          </h2>
          <ul>
            {vaccine.externalLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SourceList sourceIds={vaccine.sourceIds} verifiedOn={vaccine.verifiedOn} />
    </div>
  );
}
