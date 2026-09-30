import CurrentResourcesLink from '../components/CurrentResourcesLink.tsx';
import ModelListing from '../components/ModelListing.tsx';
import { en } from '../content/en.ts';
import { getCatalogSummary, getSiteCards } from '../services/catalog.ts';

export default function SitesPage() {
  const strings = en.models.sites;
  const summary = getCatalogSummary('sites');
  return (
    <div className="container py-4">
      <h1>{strings.title}</h1>
      <p className="lead">{en.sitesPage.intro}</p>
      <CurrentResourcesLink />
      <p>{en.listing.catalogSummary(summary.instances, summary.pages, summary.page)}</p>
      <ModelListing kind="sites" cards={getSiteCards()} />
    </div>
  );
}
