import MediaBlock from '../components/MediaBlock.tsx';
import RelatedCards from '../components/RelatedCards.tsx';
import SourceList from '../components/SourceList.tsx';
import { en } from '../content/en.ts';
import {
  formatAddress,
  getPhoto,
  getSitesForOpportunity,
  getSourcesByIds,
  getVaccinesForOpportunity,
  siteCard,
  vaccineCard,
} from '../services/catalog.ts';
import type { VolunteerOpportunity } from '../types/domain.ts';
 
// Opportunity detail page (#22). Works for past events and for ongoing roles with no end date.
export default function OpportunityDetailPage({ opportunity }: { opportunity: VolunteerOpportunity }) {
  const strings = en.opportunityDetail;
  const labels = en.fieldLabels.opportunities;
 
  const photo = getPhoto(opportunity.photoId);
  const sites = getSitesForOpportunity(opportunity.id);
  const vaccines = getVaccinesForOpportunity(opportunity.id);
  const site = sites[0];
  const historicalSource = getSourcesByIds(opportunity.sourceIds)[0];
  const isPast = opportunity.status === 'past';
 
  // Ongoing roles may have no end date; fall back to a label that says so.
  const dateText =
    opportunity.dateLabel || (opportunity.endDate === null && !isPast ? strings.noEndDate : strings.dateNotStated);
 
  return (
    <div className="container py-4">
      <h1>{opportunity.name}</h1>
      <p className="lead">{opportunity.summary}</p>
 
      {isPast ? (
        <div className="alert alert-secondary">
          <p className="mb-2">{strings.pastNotice}</p>
          <div className="d-flex flex-wrap gap-2">
            {historicalSource && (
              <a className="btn btn-outline-secondary btn-sm" href={historicalSource.url} target="_blank" rel="noopener noreferrer">
                {strings.viewHistoricalSource}
              </a>
            )}
            <a className="btn btn-outline-secondary btn-sm" href={opportunity.organizerUrl} target="_blank" rel="noopener noreferrer">
              {strings.exploreOrganizer}
            </a>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {opportunity.applicationUrl && (
            <a className="btn btn-primary" href={opportunity.applicationUrl} target="_blank" rel="noopener noreferrer">
              {strings.signUp}
            </a>
          )}
          <a className="btn btn-outline-secondary" href={opportunity.organizerUrl} target="_blank" rel="noopener noreferrer">
            {strings.exploreOrganizer}
          </a>
        </div>
      )}
 
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <h2>{strings.detailsHeading}</h2>
          <dl>
            <dt>{labels.activityType}</dt>
            <dd>{opportunity.activityType}</dd>
            <dt>{labels.organization}</dt>
            <dd>{opportunity.organization}</dd>
            <dt>{strings.dateLabel}</dt>
            <dd>{dateText}</dd>
            <dt>{labels.timeCommitment}</dt>
            <dd>{opportunity.timeCommitment}</dd>
            <dt>{labels.requirements}</dt>
            <dd>
              <ul className="mb-0">
                {opportunity.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </dd>
            <dt>{strings.statusLabel}</dt>
            <dd>{en.badges[opportunity.status]}</dd>
          </dl>
        </div>
        <div className="col-lg-6">
          {photo && <MediaBlock type="photo" photo={photo} lazy={false} />}
        </div>
      </div>
 
      {opportunity.descriptionParagraphs.length > 0 && (
        <section className="mb-4">
          <h2>{strings.aboutHeading}</h2>
          {opportunity.descriptionParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      )}
 
      {site && (
        <section className="mb-4">
          <h2>{strings.locationHeading}</h2>
          <MediaBlock
            type="map"
            label={site.name}
            address={formatAddress(site.address)}
            latitude={site.latitude}
            longitude={site.longitude}
          />
        </section>
      )}
 
      <RelatedCards heading={strings.relatedSites} cards={sites.map(siteCard)} noun="sites" />
      <RelatedCards heading={strings.relatedVaccines} cards={vaccines.map(vaccineCard)} noun="vaccines" />
 
      <SourceList sourceIds={opportunity.sourceIds} verifiedOn={opportunity.verifiedOn} />
    </div>
  );
}